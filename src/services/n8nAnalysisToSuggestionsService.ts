/**
 * n8n Analysis to Suggestions Service
 * 
 * Processes n8n analysis results and creates AI suggestions for users.
 * This service checks n8n_message_analysis for unprocessed analyses
 * and creates AI suggestions for users who are not the message sender.
 */

import { Result, createError } from '../types';
import { AISuggestion, AISuggestionStatus, convertN8nResponseToSuggestions } from '../types/aiSuggestion';
import { logger } from '../utils/logger';
import aiSuggestionService from './aiSuggestionService';
import ChatService from './chat';
import n8nMessageAnalysisService from './n8nMessageAnalysisService';

class N8nAnalysisToSuggestionsService {
  private readonly serviceLogger = logger.createServiceLogger('N8nAnalysisToSuggestions');

  /**
   * Process analyses for a chat and create suggestions for chat participants
   */
  async processAnalysesForChat(chatId: string, userId: string): Promise<Result<AISuggestion[]>> {
    try {
      this.serviceLogger.info('Processing analyses for chat', { chatId, userId });

      // Get unprocessed analyses for this chat
      const analysesResult = await n8nMessageAnalysisService.getUnprocessedAnalysesForChat(chatId);
      
      if (!analysesResult.success) {
        return {
          success: false,
          error: analysesResult.error,
          retryable: analysesResult.retryable
        };
      }

      if (analysesResult.data.length === 0) {
        this.serviceLogger.info('No unprocessed analyses found', { chatId });
        return {
          success: true,
          data: []
        };
      }

      // Get chat data to find all participants
      const chatResult = await ChatService.getChat(chatId);
      if (!chatResult.success) {
        return {
          success: false,
          error: createError({
            type: 'firebase',
            message: 'Failed to get chat data'
          }),
          retryable: true
        };
      }

      const chatParticipants = chatResult.data.participants || [];
      const allSuggestions: AISuggestion[] = [];

      // Process each analysis
      for (const analysis of analysesResult.data) {
        // Only process if this analysis is for a message not sent by the current user
        if (analysis.senderId === userId) {
          this.serviceLogger.debug('Skipping analysis - user is the sender', {
            messageId: analysis.messageId,
            userId
          });
          
          // Mark as processed anyway since user doesn't need their own suggestions
          await n8nMessageAnalysisService.markAsProcessed(analysis.id);
          continue;
        }

        // Create suggestions for this analysis
        const suggestions = convertN8nResponseToSuggestions(
          analysis.analysisResponse,
          userId, // For the user who should receive the suggestion (not the sender)
          chatId,
          analysis.messageId
        );

        if (suggestions.length === 0) {
          this.serviceLogger.debug('No suggestions generated from analysis', {
            messageId: analysis.messageId
          });
          
          // Mark as processed even if no suggestions
          await n8nMessageAnalysisService.markAsProcessed(analysis.id);
          continue;
        }

        // Create suggestions in Firestore for each participant (except the sender)
        for (const participantId of chatParticipants) {
          // Skip the message sender - they don't need suggestions about their own messages
          if (participantId === analysis.senderId) {
            continue;
          }

          // Create suggestions for this participant
          for (const suggestion of suggestions) {
            // Only create suggestions for the specific userId
            if (userId === participantId) {
              const createSuggestion = {
                userId: participantId,
                chatId: chatId,
                messageId: analysis.messageId,
                type: suggestion.type,
                status: AISuggestionStatus.PENDING,
                title: suggestion.title,
                description: suggestion.description,
                metadata: {
                  ...suggestion.metadata,
                  confidence: suggestion.confidence || 0.5
                }
              };

              const createResult = await aiSuggestionService.createSuggestion(createSuggestion);
              
              if (createResult.success && createResult.data) {
                allSuggestions.push(createResult.data);
                this.serviceLogger.debug('Created suggestion', {
                  suggestionId: createResult.data.id,
                  type: createResult.data.type
                });
              } else {
                this.serviceLogger.warn('Failed to create suggestion', {
                  error: createResult.error?.message
                });
              }
            }
          }
        }

        // Mark analysis as processed
        await n8nMessageAnalysisService.markAsProcessed(analysis.id);
      }

      this.serviceLogger.success('Completed processing analyses', {
        processedAnalyses: analysesResult.data.length,
        createdSuggestions: allSuggestions.length
      });

      return {
        success: true,
        data: allSuggestions
      };

    } catch (error: any) {
      this.serviceLogger.error('Error processing analyses', error);
      return {
        success: false,
        error: createError({
          type: 'processing',
          message: error.message || 'Failed to process analyses',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Process a specific analysis and create suggestions
   */
  async processAnalysis(analysisId: string, chatId: string, userId: string): Promise<Result<AISuggestion[]>> {
    try {
      this.serviceLogger.info('Processing specific analysis', { analysisId, userId });

      // Get the analysis
      const messageId = 'temp'; // We don't have the messageId here, need to get it from analysis
      // For now, let's get all unprocessed analyses and find the one we need
      const analysesResult = await n8nMessageAnalysisService.getUnprocessedAnalysesForChat(chatId);
      
      if (!analysesResult.success) {
        return analysesResult;
      }

      const analysis = analysesResult.data.find(a => a.id === analysisId);
      if (!analysis) {
        return {
          success: false,
          error: createError({
            type: 'not-found',
            message: 'Analysis not found'
          }),
          retryable: false
        };
      }

      // Check if user is the sender
      if (analysis.senderId === userId) {
        // Mark as processed without creating suggestions
        await n8nMessageAnalysisService.markAsProcessed(analysisId);
        return {
          success: true,
          data: []
        };
      }

      // Create suggestions from this analysis
      const suggestions = convertN8nResponseToSuggestions(
        analysis.analysisResponse,
        userId,
        chatId,
        analysis.messageId
      );

      const createdSuggestions: AISuggestion[] = [];

      for (const suggestion of suggestions) {
        const createSuggestion = {
          userId: userId,
          chatId: chatId,
          messageId: analysis.messageId,
          type: suggestion.type,
          status: AISuggestionStatus.PENDING,
          title: suggestion.title,
          description: suggestion.description,
          metadata: {
            ...suggestion.metadata,
            confidence: suggestion.confidence || 0.5
          }
        };

        const createResult = await aiSuggestionService.createSuggestion(createSuggestion);
        
        if (createResult.success && createResult.data) {
          createdSuggestions.push(createResult.data);
        }
      }

      // Mark analysis as processed
      await n8nMessageAnalysisService.markAsProcessed(analysisId);

      return {
        success: true,
        data: createdSuggestions
      };

    } catch (error: any) {
      this.serviceLogger.error('Error processing specific analysis', error);
      return {
        success: false,
        error: createError({
          type: 'processing',
          message: error.message || 'Failed to process analysis',
          originalError: error
        }),
        retryable: true
      };
    }
  }
}

export default new N8nAnalysisToSuggestionsService();
