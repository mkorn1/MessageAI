/**
 * Hook for processing n8n analyses and creating suggestions
 */

import { useEffect, useRef, useState } from 'react';
import AuthService from '../services/auth';
import n8nAnalysisToSuggestionsService from '../services/n8nAnalysisToSuggestionsService';
import { AISuggestion } from '../types/aiSuggestion';
import { logger } from '../utils/logger';

interface UseN8nAnalysisProcessingOptions {
  chatId: string;
  enabled?: boolean;
  onSuggestionsCreated?: (suggestions: AISuggestion[]) => void;
}

export const useN8nAnalysisProcessing = ({
  chatId,
  enabled = true,
  onSuggestionsCreated
}: UseN8nAnalysisProcessingOptions) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const processedAnalysesRef = useRef<Set<string>>(new Set());
  const serviceLogger = logger.createServiceLogger('useN8nAnalysisProcessing');

  const processAnalyses = async () => {
    if (!enabled || isProcessing) {
      return;
    }

    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      serviceLogger.warn('Cannot process analyses - no current user');
      return;
    }

    try {
      setIsProcessing(true);
      serviceLogger.info('Processing analyses for chat', { chatId });

      const result = await n8nAnalysisToSuggestionsService.processAnalysesForChat(
        chatId,
        currentUser.uid
      );

      if (result.success && result.data) {
        const count = result.data.length;
        setProcessedCount(prev => prev + count);
        
        if (count > 0) {
          serviceLogger.info('Created suggestions from analyses', { count });
          onSuggestionsCreated?.(result.data);
        }
      } else {
        serviceLogger.warn('Failed to process analyses', {
          error: result.error?.message
        });
      }
    } catch (error) {
      serviceLogger.error('Error processing analyses', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process analyses when component mounts and chatId changes
  useEffect(() => {
    if (enabled && chatId && !processedAnalysesRef.current.has(chatId)) {
      processedAnalysesRef.current.add(chatId);
      processAnalyses();
    }
  }, [chatId, enabled]);

  return {
    isProcessing,
    processedCount,
    processAnalyses
  };
};

export default useN8nAnalysisProcessing;
