import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { getN8nConfig, N8nConfig, validateN8nConfig } from '../config/n8nConfig';
import { createError, isRetryableError, Result } from '../types';
import { N8nActualResponse, N8nAnalysisPayload } from '../types/aiSuggestion';
import { Message } from '../types/message';
import { logger } from '../utils/logger';

class N8nWebhookService {
  private config: N8nConfig;
  private readonly serviceLogger = logger.createServiceLogger('N8nWebhook');

  constructor() {
    this.config = getN8nConfig();
    
    // Validate configuration on initialization
    const validation = validateN8nConfig(this.config);
    if (!validation.valid) {
      this.serviceLogger.error('Invalid configuration', validation.errors);
      throw new Error(`Invalid n8n configuration: ${validation.errors.join(', ')}`);
    }
    
    this.serviceLogger.success('Configuration loaded successfully');
    this.serviceLogger.debug('Config summary', {
      environment: this.config.environment,
      hasAnalysisUrl: !!this.config.analysisWebhookUrl,
      hasActionUrl: !!this.config.actionWebhookUrl,
      hasApiKey: !!this.config.apiKey,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts,
    });
  }

  /**
   * Fetch last 10 messages from all chats for context
   */
  async fetchLastMessagesForContext(userId: string, limitCount: number = 10): Promise<Result<Message[]>> {
    try {
      console.log('📚 N8nWebhookService: Fetching last messages for context');
      console.log('👤 User ID:', userId);
      console.log('📊 Limit:', limitCount);

      // Query messages from all chats, ordered by timestamp (most recent first)
      const messagesQuery = query(
        collection(db, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages: Message[] = [];

      messagesSnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as Message);
      });

      // Sort by timestamp ascending (oldest first) for context
      messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      console.log(`✅ Fetched ${messages.length} messages for context`);
      return {
        success: true,
        data: messages
      };

    } catch (error: any) {
      console.error('❌ N8nWebhookService: Error fetching context messages:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to fetch context messages',
          originalError: error
        }),
        retryable: isRetryableError(error)
      };
    }
  }

  /**
   * Format message and context for n8n webhook payload
   */
  private formatWebhookPayload(
    message: Message,
    chatContext: Message[],
    userId: string
  ): N8nAnalysisPayload {
    return {
      message: {
        id: message.id,
        text: message.text,
        senderId: message.senderId,
        chatId: message.chatId,
        timestamp: message.timestamp.toISOString(),
        messageType: message.messageType || 'text'
      },
      chatContext: chatContext.map(msg => ({
        id: msg.id,
        text: msg.text,
        senderId: msg.senderId,
        chatId: msg.chatId,
        timestamp: msg.timestamp.toISOString()
      })),
      userId: userId
    };
  }

  /**
   * Validate webhook payload before sending
   */
  private validateWebhookPayload(payload: N8nAnalysisPayload): boolean {
    return (
      payload &&
      payload.message &&
      typeof payload.message.id === 'string' &&
      typeof payload.message.text === 'string' &&
      typeof payload.message.senderId === 'string' &&
      typeof payload.message.chatId === 'string' &&
      typeof payload.message.timestamp === 'string' &&
      typeof payload.message.messageType === 'string' &&
      Array.isArray(payload.chatContext) &&
      typeof payload.userId === 'string'
    );
  }

  /**
   * Send message analysis request to n8n webhook
   */
  async sendMessageAnalysis(
    message: Message,
    chatContext: Message[],
    userId: string
  ): Promise<Result<N8nActualResponse[]>> {
    try {
      console.log('🚀 N8nWebhookService: Starting sendMessageAnalysis');
      console.log('📝 Message ID:', message.id);
      console.log('👤 User ID:', userId);
      console.log('📊 Context Length:', chatContext.length);
      console.log('🔗 Webhook URL:', this.config.analysisWebhookUrl);
      console.log('⚙️ Config:', {
        environment: this.config.environment,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        hasApiKey: !!this.config.apiKey
      });
      
      this.serviceLogger.info('Sending message analysis request', {
        messageId: message.id,
        userId,
        chatContextLength: chatContext.length
      });

      // Validate inputs
      if (!message || !chatContext || !userId) {
        return {
          success: false,
          error: createError({
            type: 'validation',
            message: 'Missing required parameters for message analysis'
          }),
          retryable: false
        };
      }

      // Format payload according to n8n expected format
      const payload = this.formatWebhookPayload(message, chatContext, userId);
      
      // Validate payload before sending
      if (!this.validateWebhookPayload(payload)) {
        return {
          success: false,
          error: createError({
            type: 'validation',
            message: 'Invalid webhook payload format'
          }),
          retryable: false
        };
      }

      this.serviceLogger.debug('Payload prepared', {
        messageId: payload.message.id,
        contextCount: payload.chatContext.length,
        userId: payload.userId
      });

      // Send webhook request with retry logic
      const response = await this.sendWithRetry(payload);

      this.serviceLogger.success('Analysis request completed successfully');
      return {
        success: true,
        data: response
      };

    } catch (error: any) {
      this.serviceLogger.error('Error in message analysis', error);
      
      // Classify error for better handling
      const errorType = this.classifyError(error);
      
      return {
        success: false,
        error: createError({
          type: errorType.type,
          message: errorType.message,
          originalError: error
        }),
        retryable: errorType.retryable
      };
    }
  }

  /**
   * Classify error for appropriate handling
   */
  private classifyError(error: any): { type: string; message: string; retryable: boolean } {
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Network connectivity issues
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('unreachable')) {
      return {
        type: 'network',
        message: 'Network connectivity issue. Please check your internet connection.',
        retryable: true
      };
    }
    
    // Timeout errors
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('aborted') ||
        errorMessage.includes('signal')) {
      return {
        type: 'timeout',
        message: `Request timed out after ${this.config.timeout}ms. The n8n service may be slow to respond.`,
        retryable: true
      };
    }
    
    // JSON parsing errors (network interruption)
    if (errorMessage.includes('json') || 
        errorMessage.includes('unexpected end') ||
        errorMessage.includes('parse')) {
      return {
        type: 'network',
        message: 'Response was interrupted or corrupted during transmission.',
        retryable: true
      };
    }
    
    // DNS resolution errors
    if (errorMessage.includes('dns') || 
        errorMessage.includes('name resolution') ||
        errorMessage.includes('hostname')) {
      return {
        type: 'network',
        message: 'Unable to resolve n8n webhook hostname. Please check your internet connection.',
        retryable: true
      };
    }
    
    // SSL/TLS errors
    if (errorMessage.includes('ssl') || 
        errorMessage.includes('tls') ||
        errorMessage.includes('certificate')) {
      return {
        type: 'network',
        message: 'SSL/TLS connection error. Please check your network security settings.',
        retryable: true
      };
    }
    
    // Rate limiting
    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429')) {
      return {
        type: 'rate_limit',
        message: 'Too many requests to n8n webhook. Please wait before trying again.',
        retryable: true
      };
    }
    
    // Server errors (5xx)
    if (errorMessage.includes('http 5') || 
        errorMessage.includes('internal server error') ||
        errorMessage.includes('service unavailable')) {
      return {
        type: 'server',
        message: 'n8n webhook service is temporarily unavailable. Please try again later.',
        retryable: true
      };
    }
    
    // Client errors (4xx) - usually not retryable
    if (errorMessage.includes('http 4') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden')) {
      return {
        type: 'client',
        message: 'Webhook configuration error. Please check the webhook URL and settings.',
        retryable: false
      };
    }
    
    // Unknown errors
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred while communicating with n8n.',
      retryable: true
    };
  }

  /**
   * Send webhook request with retry logic and exponential backoff
   */
  private async sendWithRetry(payload: N8nAnalysisPayload): Promise<N8nActualResponse[]> {
    let lastError: Error | null = null;

    console.log('🔄 Starting sendWithRetry');
    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${this.config.retryAttempts} to send webhook`);

        // Create a timeout promise for React Native compatibility
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timed out after ${this.config.timeout}ms. The n8n service may be slow to respond.`));
          }, this.config.timeout!);
        });

        // Create the fetch promise
        const fetchPromise = fetch(this.config.analysisWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MessageAI/1.0',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          },
          body: JSON.stringify(payload)
        });

        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        console.log('📡 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        // Handle different HTTP status codes
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          // Try to parse error response for more details
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage += ` - ${errorData.message}`;
            }
            if (errorData.hint) {
              errorMessage += ` (${errorData.hint})`;
            }
          } catch {
            // If JSON parsing fails, use the raw text
            if (errorText) {
              errorMessage += ` - ${errorText}`;
            }
          }
          
          throw new Error(errorMessage);
        }

        // Parse response with better error handling
        let responseData: any;
        try {
          const responseText = await response.text();
          console.log('📄 Raw response text:', responseText);
          
          if (!responseText.trim()) {
            throw new Error('Empty response from n8n webhook');
          }
          responseData = JSON.parse(responseText);
          console.log('📊 Parsed response data:', JSON.stringify(responseData, null, 2));
        } catch (parseError: any) {
          console.error('❌ Parse error:', parseError);
          throw new Error(`Failed to parse response: ${parseError.message}`);
        }
        
        // Validate response format
        if (!this.isValidN8nResponse(responseData)) {
          throw new Error('Invalid response format from n8n webhook');
        }

        console.log(`✅ Webhook request successful on attempt ${attempt}`);
        return responseData;

      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

        // Determine if this error should trigger a retry
        const shouldRetry = this.shouldRetryError(error, attempt);
        
        if (!shouldRetry) {
          console.log(`❌ Not retrying due to error type: ${error.message}`);
          throw error;
        }

        // Wait before retry (exponential backoff with jitter)
        if (attempt < this.config.retryAttempts!) {
          const baseDelay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
          const jitter = Math.random() * 1000; // Add up to 1s of jitter
          const delay = baseDelay + jitter;
          
          console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetryError(error: Error, attempt: number): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Don't retry on client errors (4xx) - these are usually permanent
    if (errorMessage.includes('http 4')) {
      return false;
    }
    
    // Don't retry on validation errors
    if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      return false;
    }
    
    // Don't retry on authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return false;
    }
    
    // Don't retry on "webhook not registered" errors (404)
    if (errorMessage.includes('not registered') || errorMessage.includes('404')) {
      return false;
    }
    
    // Don't retry on "no respond to webhook node" errors (500)
    if (errorMessage.includes('no respond to webhook node')) {
      return false;
    }
    
    // Retry on network errors, timeouts, and server errors (5xx)
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('network') || 
        errorMessage.includes('http 5') ||
        errorMessage.includes('fetch')) {
      return true;
    }
    
    // Retry on JSON parsing errors (might be temporary)
    if (errorMessage.includes('json') || errorMessage.includes('parse')) {
      return attempt <= 2; // Only retry twice for parsing errors
    }
    
    // Default to retry for unknown errors
    return true;
  }

  /**
   * Validate n8n webhook response format
   */
  private isValidN8nResponse(response: any): response is N8nActualResponse[] {
    return (
      Array.isArray(response) &&
      response.length > 0 &&
      response.every((item: any) => 
        item &&
        item.message &&
        item.message.role === 'assistant' &&
        item.message.content &&
        typeof item.message.content.chat_id === 'string' &&
        Array.isArray(item.message.content.categories)
      )
    );
  }

  /**
   * Update configuration (useful for runtime config changes)
   */
  updateConfig(newConfig: Partial<N8nConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Validate updated configuration
    const validation = validateN8nConfig(this.config);
    if (!validation.valid) {
      console.error('❌ N8nWebhookService: Invalid updated configuration:', validation.errors);
      throw new Error(`Invalid n8n configuration: ${validation.errors.join(', ')}`);
    }
    
    console.log('🔄 N8nWebhookService: Configuration updated successfully');
  }

  /**
   * Get current configuration (for debugging)
   */
  getConfig(): N8nConfig {
    return { ...this.config };
  }
}

// Create singleton instance with configuration from config file
const n8nWebhookService = new N8nWebhookService();

export default n8nWebhookService;
