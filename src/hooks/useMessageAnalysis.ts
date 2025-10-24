/**
 * useMessageAnalysis Hook
 * 
 * This hook provides functionality to analyze messages and trigger AI suggestions.
 * It automatically sends messages to the n8n webhook for analysis when new
 * messages are detected, and handles the response to create AI suggestions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import aiSuggestionService from '../services/aiSuggestionService';
import n8nWebhookService from '../services/n8nWebhookService';
import { convertN8nResponseToSuggestions } from '../types/aiSuggestion';
import { Result } from '../types/errors';
import { Message } from '../types/message';

interface UseMessageAnalysisOptions {
  enabled?: boolean;
  debounceMs?: number;
  maxRetries?: number;
  onAnalysisComplete?: (suggestionCount: number) => void;
  onAnalysisError?: (error: string) => void;
}

interface UseMessageAnalysisReturn {
  analyzeMessage: (message: Message, chatContext?: Message[]) => Promise<Result<void>>;
  isAnalyzing: boolean;
  lastAnalysisResult: {
    success: boolean;
    suggestionCount: number;
    error?: string;
    timestamp: Date;
  } | null;
  clearLastResult: () => void;
}

export const useMessageAnalysis = (
  options: UseMessageAnalysisOptions = {}
): UseMessageAnalysisReturn => {
  const {
    enabled = true,
    debounceMs = 1000,
    maxRetries = 2,
    onAnalysisComplete,
    onAnalysisError,
  } = options;

  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<{
    success: boolean;
    suggestionCount: number;
    error?: string;
    timestamp: Date;
  } | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Analysis queue to prevent duplicate analysis of the same message
  const analyzedMessagesRef = useRef<Set<string>>(new Set());

  /**
   * Analyze a single message and create AI suggestions
   */
  const analyzeMessage = useCallback(async (
    message: Message,
    chatContext?: Message[]
  ): Promise<Result<void>> => {
    // Check if analysis is enabled
    if (!enabled) {
      console.log('🔍 useMessageAnalysis: Analysis disabled, skipping');
      return {
        success: true,
        data: undefined
      };
    }

    // Check if user is authenticated
    if (!user?.uid) {
      console.log('🔍 useMessageAnalysis: No authenticated user, skipping analysis');
      return {
        success: false,
        error: {
          type: 'auth',
          message: 'User must be authenticated to analyze messages'
        },
        retryable: false
      };
    }

    // Check if message has already been analyzed
    if (analyzedMessagesRef.current.has(message.id)) {
      console.log('🔍 useMessageAnalysis: Message already analyzed, skipping');
      return {
        success: true,
        data: undefined
      };
    }

    // Check if message is suitable for analysis
    if (!isMessageSuitableForAnalysis(message)) {
      console.log('🔍 useMessageAnalysis: Message not suitable for analysis, skipping');
      return {
        success: true,
        data: undefined
      };
    }

    try {
      setIsAnalyzing(true);
      console.log('🔍 useMessageAnalysis: Starting message analysis');
      console.log('📤 Message ID:', message.id);
      console.log('💬 Message text:', message.text.substring(0, 100) + '...');

      // Get chat context if not provided
      let contextMessages: Message[] = [];
      if (chatContext) {
        contextMessages = chatContext;
      } else {
        console.log('📚 Fetching chat context for analysis');
        const contextResult = await n8nWebhookService.fetchLastMessagesForContext(user.uid, 10);
        if (contextResult.success && contextResult.data) {
          contextMessages = contextResult.data;
        } else {
          console.warn('⚠️ Failed to fetch chat context, proceeding without context');
        }
      }

      // Send analysis request to n8n
      const analysisResult = await n8nWebhookService.sendMessageAnalysis(
        message,
        contextMessages,
        user.uid
      );

      if (!analysisResult.success) {
        throw new Error(analysisResult.error?.message || 'Analysis request failed');
      }

      const n8nResponse = analysisResult.data;
      console.log('✅ Received analysis response from n8n');
      console.log('📊 Response items:', n8nResponse.length);

      // Convert n8n response to suggestions
      const suggestions = convertN8nResponseToSuggestions(
        n8nResponse,
        user.uid,
        message.chatId,
        message.id
      );

      console.log('🔄 Converted to suggestions:', suggestions.length);

      if (suggestions.length === 0) {
        console.log('📭 No suggestions generated from analysis');
        setLastAnalysisResult({
          success: true,
          suggestionCount: 0,
          timestamp: new Date()
        });
        onAnalysisComplete?.(0);
        return {
          success: true,
          data: undefined
        };
      }

      // Create suggestions in Firestore
      let createdCount = 0;
      let errorCount = 0;

      for (const suggestion of suggestions) {
        try {
          const createResult = await aiSuggestionService.createSuggestion(suggestion);
          if (createResult.success) {
            createdCount++;
            console.log('✅ Created suggestion:', suggestion.type);
          } else {
            errorCount++;
            console.error('❌ Failed to create suggestion:', createResult.error?.message);
          }
        } catch (error: any) {
          errorCount++;
          console.error('❌ Error creating suggestion:', error.message);
        }
      }

      // Mark message as analyzed
      analyzedMessagesRef.current.add(message.id);

      // Set result
      const result = {
        success: createdCount > 0,
        suggestionCount: createdCount,
        error: errorCount > 0 ? `${errorCount} suggestions failed to create` : undefined,
        timestamp: new Date()
      };

      setLastAnalysisResult(result);

      console.log('🎉 Analysis completed successfully');
      console.log('📊 Created suggestions:', createdCount);
      console.log('❌ Failed suggestions:', errorCount);

      // Call completion callback
      onAnalysisComplete?.(createdCount);

      if (errorCount > 0) {
        onAnalysisError?.(`${errorCount} suggestions failed to create`);
      }

      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      console.error('❌ useMessageAnalysis: Analysis failed:', error);
      
      const result = {
        success: false,
        suggestionCount: 0,
        error: error.message || 'Analysis failed',
        timestamp: new Date()
      };

      setLastAnalysisResult(result);
      onAnalysisError?.(error.message || 'Analysis failed');

      return {
        success: false,
        error: {
          type: 'analysis',
          message: error.message || 'Message analysis failed',
          originalError: error
        },
        retryable: true
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, [enabled, user?.uid, onAnalysisComplete, onAnalysisError]);

  /**
   * Debounced analysis function
   */
  const debouncedAnalyzeMessage = useCallback((
    message: Message,
    chatContext?: Message[]
  ) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      analyzeMessage(message, chatContext);
    }, debounceMs);
  }, [analyzeMessage, debounceMs]);

  /**
   * Clear the last analysis result
   */
  const clearLastResult = useCallback(() => {
    setLastAnalysisResult(null);
  }, []);

  /**
   * Check if a message is suitable for AI analysis
   */
  const isMessageSuitableForAnalysis = (message: Message): boolean => {
    // Skip system messages
    if (message.messageType === 'system') {
      return false;
    }

    // Skip very short messages (less than 10 characters)
    if (message.text.length < 10) {
      return false;
    }

    // Skip messages that are just emojis or single words
    const words = message.text.trim().split(/\s+/);
    if (words.length < 2) {
      return false;
    }

    // Skip messages that are just URLs or links
    const urlRegex = /^https?:\/\/.+/i;
    if (urlRegex.test(message.text.trim())) {
      return false;
    }

    // Skip messages that are just numbers or special characters
    const hasContentRegex = /[a-zA-Z]/;
    if (!hasContentRegex.test(message.text)) {
      return false;
    }

    return true;
  };

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Clear analyzed messages cache periodically to prevent memory buildup
   */
  useEffect(() => {
    const interval = setInterval(() => {
      analyzedMessagesRef.current.clear();
      console.log('🧹 Cleared analyzed messages cache');
    }, 5 * 60 * 1000); // Clear every 5 minutes

    return () => clearInterval(interval);
  }, []);

  return {
    analyzeMessage,
    isAnalyzing,
    lastAnalysisResult,
    clearLastResult,
  };
};

export default useMessageAnalysis;
