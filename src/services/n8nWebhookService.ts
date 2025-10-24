import { Result, createError, isRetryableError } from '../types';
import { N8nAnalysisPayload, N8nAnalysisResponse } from '../types/aiSuggestion';
import { Message } from '../types/message';

interface N8nWebhookConfig {
  analysisWebhookUrl: string;
  actionWebhookUrl?: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

class N8nWebhookService {
  private config: N8nWebhookConfig;

  constructor(config: N8nWebhookConfig) {
    this.config = {
      timeout: 10000, // 10 seconds default
      retryAttempts: 3, // 3 retry attempts default
      ...config
    };
  }

  /**
   * Send message analysis request to n8n webhook
   */
  async sendMessageAnalysis(
    message: Message,
    chatContext: Message[],
    userId: string
  ): Promise<Result<N8nAnalysisResponse>> {
    try {
      console.log('🔗 N8nWebhookService: Sending message analysis request');
      console.log('📤 Message ID:', message.id);
      console.log('👤 User ID:', userId);
      console.log('💬 Chat Context Length:', chatContext.length);

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
      const payload: N8nAnalysisPayload = {
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

      console.log('📦 Payload prepared:', {
        messageId: payload.message.id,
        contextCount: payload.chatContext.length,
        userId: payload.userId
      });

      // Send webhook request with retry logic
      const response = await this.sendWithRetry(payload);

      console.log('✅ N8nWebhookService: Analysis request completed successfully');
      return {
        success: true,
        data: response
      };

    } catch (error: any) {
      console.error('❌ N8nWebhookService: Error in message analysis:', error);
      return {
        success: false,
        error: createError({
          type: 'network',
          message: error.message || 'Failed to send message analysis request',
          originalError: error
        }),
        retryable: isRetryableError(error)
      };
    }
  }

  /**
   * Send webhook request with retry logic and exponential backoff
   */
  private async sendWithRetry(payload: N8nAnalysisPayload): Promise<N8nAnalysisResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${this.config.retryAttempts} to send webhook`);

        const response = await fetch(this.config.analysisWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.config.timeout!)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        
        // Validate response format
        if (!this.isValidN8nResponse(responseData)) {
          throw new Error('Invalid response format from n8n webhook');
        }

        console.log(`✅ Webhook request successful on attempt ${attempt}`);
        return responseData;

      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

        // Don't retry on validation errors or client errors (4xx)
        if (error.message?.includes('HTTP 4')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retryAttempts!) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Validate n8n webhook response format
   */
  private isValidN8nResponse(response: any): response is N8nAnalysisResponse {
    return (
      response &&
      typeof response === 'object' &&
      Array.isArray(response.suggestions) &&
      response.suggestions.every((suggestion: any) => 
        suggestion &&
        typeof suggestion.type === 'string' &&
        typeof suggestion.title === 'string' &&
        typeof suggestion.description === 'string' &&
        typeof suggestion.metadata === 'object'
      )
    );
  }

  /**
   * Update configuration (useful for runtime config changes)
   */
  updateConfig(newConfig: Partial<N8nWebhookConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 N8nWebhookService: Configuration updated');
  }

  /**
   * Get current configuration (for debugging)
   */
  getConfig(): N8nWebhookConfig {
    return { ...this.config };
  }
}

// Create singleton instance with default configuration
const n8nWebhookService = new N8nWebhookService({
  analysisWebhookUrl: 'https://mkorn1.app.n8n.cloud/webhook-test/cfb3bef3-f299-4f85-8eb4-cb350dbbb810',
  timeout: 10000,
  retryAttempts: 3
});

export default n8nWebhookService;
