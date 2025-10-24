/**
 * n8n Response Parser Service
 * 
 * Handles parsing n8n webhook responses and converting them into
 * AI suggestions that can be stored in Firestore.
 */

import { Result, createError } from '../types';
import {
    AISuggestionType,
    CalendarEventMetadata,
    CreateAISuggestion,
    DeadlineReminderMetadata,
    DecisionSummaryMetadata,
    N8nActualResponse,
    PriorityFlagMetadata,
    RSVPTrackingMetadata,
    SuggestedResponseMetadata
} from '../types/aiSuggestion';
import { logger } from '../utils/logger';
import aiSuggestionService from './aiSuggestionService';

class N8nResponseParserService {
  private readonly serviceLogger = logger.createServiceLogger('N8nParser');
  /**
   * Parse n8n webhook response and create suggestions
   */
  async parseAndCreateSuggestions(
    n8nResponse: N8nActualResponse[],
    userId: string,
    chatId: string,
    messageId: string
  ): Promise<Result<CreateAISuggestion[]>> {
    const startTime = Date.now();
    
    try {
      this.serviceLogger.info('Starting n8n response parsing', {
        responseItems: n8nResponse.length,
        userId,
        chatId,
        messageId,
        timestamp: new Date().toISOString()
      });

      // Log raw response for debugging
      this.serviceLogger.debug('Raw n8n response', n8nResponse);

      // Validate input parameters
      const inputValidation = this.validateInputParameters(userId, chatId, messageId);
      if (!inputValidation.valid) {
        this.serviceLogger.error('Input parameter validation failed', {
          errors: inputValidation.errors,
          userId,
          chatId,
          messageId
        });
        return {
          success: false,
          error: createError({
            type: 'validation',
            message: `Invalid input parameters: ${inputValidation.errors.join(', ')}`
          }),
          retryable: false
        };
      }

      // Validate n8n response structure
      const responseValidation = this.validateN8nResponse(n8nResponse);
      if (!responseValidation.valid) {
        this.serviceLogger.error('n8n response structure validation failed', {
          errors: responseValidation.errors,
          responseType: typeof n8nResponse,
          responseLength: Array.isArray(n8nResponse) ? n8nResponse.length : 'not array'
        });
        return {
          success: false,
          error: createError({
            type: 'validation',
            message: `Invalid n8n response structure: ${responseValidation.errors.join(', ')}`
          }),
          retryable: false
        };
      }

      const suggestions: CreateAISuggestion[] = [];
      let processedItems = 0;
      let skippedItems = 0;
      let createdSuggestions = 0;
      let failedSuggestions = 0;

      // Process each response item
      for (let i = 0; i < n8nResponse.length; i++) {
        const responseItem = n8nResponse[i];
        
        this.serviceLogger.debug(`Processing response item ${i + 1}/${n8nResponse.length}`, {
          itemIndex: i,
          hasMessage: !!responseItem.message,
          hasContent: !!responseItem.message?.content
        });

        // Validate individual response item
        const itemValidation = this.validateResponseItem(responseItem);
        if (!itemValidation.valid) {
          this.serviceLogger.warn(`Skipping invalid response item ${i + 1}`, {
            itemIndex: i,
            errors: itemValidation.errors,
            itemStructure: {
              hasMessage: !!responseItem.message,
              hasContent: !!responseItem.message?.content,
              messageRole: responseItem.message?.role
            }
          });
          skippedItems++;
          continue;
        }

        processedItems++;
        const content = responseItem.message.content;
        const categories = content.categories || [];
        const extractedDetails = content.extracted_details || {};
        const confidence = this.mapConfidenceToNumber(content.confidence);
        const reasoning = this.sanitizeReasoning(content.reasoning || '');

        this.serviceLogger.info(`Processing item ${i + 1} categories`, {
          itemIndex: i,
          categories,
          confidence,
          reasoningLength: reasoning.length,
          extractedDetailsKeys: Object.keys(extractedDetails)
        });

        // Validate and sanitize extracted details
        const sanitizedDetails = this.sanitizeExtractedDetails(extractedDetails);
        
        this.serviceLogger.debug(`Sanitized details for item ${i + 1}`, {
          itemIndex: i,
          originalKeys: Object.keys(extractedDetails),
          sanitizedKeys: Object.keys(sanitizedDetails)
        });

        // Create suggestions for each category
        for (const category of categories) {
          // Validate category
          if (!this.isValidCategory(category)) {
            this.serviceLogger.warn(`Invalid category detected`, {
              category,
              validCategories: ['CALENDAR_EVENT', 'DECISION', 'PRIORITY', 'RSVP', 'DEADLINE', 'SUGGESTED_RESPONSE']
            });
            failedSuggestions++;
            continue;
          }

          try {
            const suggestion = this.createSuggestionFromCategory(
              category,
              sanitizedDetails,
              confidence,
              reasoning,
              userId,
              chatId,
              messageId
            );

            if (suggestion) {
              // Final validation of created suggestion
              const suggestionValidation = this.validateCreatedSuggestion(suggestion);
              if (suggestionValidation.valid) {
                suggestions.push(suggestion);
                createdSuggestions++;
                this.serviceLogger.success(`Created suggestion for category: ${category}`, {
                  category,
                  suggestionTitle: suggestion.title,
                  suggestionType: suggestion.type
                });
              } else {
                this.serviceLogger.warn(`Invalid suggestion created for category ${category}`, {
                  category,
                  errors: suggestionValidation.errors,
                  suggestionTitle: suggestion.title
                });
                failedSuggestions++;
              }
            } else {
              this.serviceLogger.warn(`Failed to create suggestion for category: ${category}`, {
                category,
                extractedDetails: sanitizedDetails
              });
              failedSuggestions++;
            }
          } catch (categoryError: any) {
            this.serviceLogger.error(`Error creating suggestion for category ${category}`, {
              category,
              error: categoryError.message,
              stack: categoryError.stack
            });
            failedSuggestions++;
          }
        }
      }

      const processingTime = Date.now() - startTime;
      
      this.serviceLogger.success('n8n response parsing completed', {
        processingTimeMs: processingTime,
        totalItems: n8nResponse.length,
        processedItems,
        skippedItems,
        createdSuggestions,
        failedSuggestions,
        successRate: `${Math.round((createdSuggestions / (createdSuggestions + failedSuggestions)) * 100)}%`
      });

      return {
        success: true,
        data: suggestions
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      this.serviceLogger.error('Critical error during n8n response parsing', {
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
        userId,
        chatId,
        messageId,
        responseType: typeof n8nResponse,
        responseLength: Array.isArray(n8nResponse) ? n8nResponse.length : 'not array'
      });

      return {
        success: false,
        error: createError({
          type: 'parsing',
          message: error.message || 'Failed to parse n8n response',
          originalError: error
        }),
        retryable: false
      };
    }
  }

  /**
   * Create a suggestion from a specific category
   */
  private createSuggestionFromCategory(
    category: string,
    extractedDetails: any,
    confidence: number,
    reasoning: string,
    userId: string,
    chatId: string,
    messageId: string
  ): CreateAISuggestion | null {
    try {
      switch (category) {
        case 'CALENDAR_EVENT':
          return this.createCalendarEventSuggestion(
            extractedDetails,
            confidence,
            reasoning,
            userId,
            chatId,
            messageId
          );

        case 'DECISION':
          return this.createDecisionSummarySuggestion(
            extractedDetails,
            confidence,
            reasoning,
            userId,
            chatId,
            messageId
          );

        case 'PRIORITY':
          return this.createPriorityFlagSuggestion(
            extractedDetails,
            confidence,
            reasoning,
            userId,
            chatId,
            messageId
          );

        case 'RSVP':
          return this.createRSVPTrackingSuggestion(
            extractedDetails,
            confidence,
            reasoning,
            userId,
            chatId,
            messageId
          );

        case 'DEADLINE':
          return this.createDeadlineReminderSuggestion(
            extractedDetails,
            confidence,
            reasoning,
            userId,
            chatId,
            messageId
          );

        case 'SUGGESTED_RESPONSE':
          return this.createSuggestedResponseSuggestion(
            extractedDetails,
            confidence,
            reasoning,
            userId,
            chatId,
            messageId
          );

        default:
          console.warn(`⚠️ Unknown category: ${category}`);
          return null;
      }
    } catch (error: any) {
      console.error(`❌ Error creating suggestion for category ${category}:`, error);
      return null;
    }
  }

  /**
   * Create calendar event suggestion
   */
  private createCalendarEventSuggestion(
    details: any,
    confidence: number,
    reasoning: string,
    userId: string,
    chatId: string,
    messageId: string
  ): CreateAISuggestion {
    const eventDate = details.date ? new Date(details.date) : new Date();
    const eventTime = details.time || '14:00';
    
    // Combine date and time
    const [hours, minutes] = eventTime.split(':').map(Number);
    eventDate.setHours(hours, minutes, 0, 0);

    const metadata: CalendarEventMetadata = {
      eventDate: eventDate.toISOString(),
      eventLocation: details.location || null,
      eventDuration: 60, // Default 1 hour
      eventTitle: details.event_title || 'Team Meeting',
      eventDescription: details.event_description || 'Meeting scheduled via message',
      attendees: details.people_mentioned || [],
      confidence
    };

    return {
      userId,
      chatId,
      messageId,
      type: 'calendar_event' as AISuggestionType,
      title: `Add "${metadata.eventTitle}" to calendar`,
      description: `Meeting scheduled for ${eventDate.toLocaleDateString()} at ${eventTime}${details.location ? ` in ${details.location}` : ''}`,
      metadata,
      status: 'pending'
    };
  }

  /**
   * Create decision summary suggestion
   */
  private createDecisionSummarySuggestion(
    details: any,
    confidence: number,
    reasoning: string,
    userId: string,
    chatId: string,
    messageId: string
  ): CreateAISuggestion {
    const metadata: DecisionSummaryMetadata = {
      decisionTopic: details.decision_topic || 'Team decision',
      decisionOptions: details.decision_options || [],
      decisionDeadline: details.deadline ? new Date(details.deadline).toISOString() : null,
      stakeholders: details.stakeholders || [],
      confidence
    };

    return {
      userId,
      chatId,
      messageId,
      type: 'decision_summary' as AISuggestionType,
      title: `Decision: ${metadata.decisionTopic}`,
      description: `Track decision about ${metadata.decisionTopic}. ${reasoning}`,
      metadata,
      status: 'pending'
    };
  }

  /**
   * Create priority flag suggestion
   */
  private createPriorityFlagSuggestion(
    details: any,
    confidence: number,
    reasoning: string,
    userId: string,
    chatId: string,
    messageId: string
  ): CreateAISuggestion {
    const priorityLevel = this.mapUrgencyToPriority(details.urgency || 'medium');
    
    const metadata: PriorityFlagMetadata = {
      priorityLevel,
      urgencyReason: details.urgency_reason || reasoning,
      originalMessage: details.original_message || '',
      requiresAction: details.action_required || false,
      confidence
    };

    return {
      userId,
      chatId,
      messageId,
      type: 'priority_flag' as AISuggestionType,
      title: `Priority: ${this.getPriorityTitle(priorityLevel)}`,
      description: `${reasoning} ${details.action_required ? 'Action required.' : ''}`,
      metadata,
      status: 'pending'
    };
  }

  /**
   * Create RSVP tracking suggestion
   */
  private createRSVPTrackingSuggestion(
    details: any,
    confidence: number,
    reasoning: string,
    userId: string,
    chatId: string,
    messageId: string
  ): CreateAISuggestion {
    const metadata: RSVPTrackingMetadata = {
      eventTitle: details.event_title || 'Event',
      eventDate: details.date ? new Date(details.date).toISOString() : null,
      expectedAttendees: details.expected_attendees || [],
      respondedAttendees: details.responded_attendees || [],
      pendingResponses: details.pending_responses || [],
      rsvpDeadline: details.rsvp_deadline ? new Date(details.rsvp_deadline).toISOString() : null,
      confidence
    };

    return {
      userId,
      chatId,
      messageId,
      type: 'rsvp_tracking' as AISuggestionType,
      title: `Track RSVPs for ${metadata.eventTitle}`,
      description: `Monitor responses for ${metadata.eventTitle}. ${reasoning}`,
      metadata,
      status: 'pending'
    };
  }

  /**
   * Create deadline reminder suggestion
   */
  private createDeadlineReminderSuggestion(
    details: any,
    confidence: number,
    reasoning: string,
    userId: string,
    chatId: string,
    messageId: string
  ): CreateAISuggestion {
    const deadlineDate = details.deadline ? new Date(details.deadline) : new Date();
    
    const metadata: DeadlineReminderMetadata = {
      deadlineDate: deadlineDate.toISOString(),
      taskTitle: details.task_title || 'Task',
      taskDescription: details.task_description || '',
      reminderFrequency: details.reminder_frequency || 'daily',
      priorityLevel: this.mapUrgencyToPriority(details.urgency || 'medium'),
      confidence
    };

    return {
      userId,
      chatId,
      messageId,
      type: 'deadline_reminder' as AISuggestionType,
      title: `Set reminder for ${metadata.taskTitle}`,
      description: `Deadline: ${deadlineDate.toLocaleDateString()}. ${reasoning}`,
      metadata,
      status: 'pending'
    };
  }

  /**
   * Create suggested response suggestion
   */
  private createSuggestedResponseSuggestion(
    details: any,
    confidence: number,
    reasoning: string,
    userId: string,
    chatId: string,
    messageId: string
  ): CreateAISuggestion {
    const metadata: SuggestedResponseMetadata = {
      suggestedText: details.suggested_text || '',
      responseTone: details.response_tone || 'professional',
      responseType: details.response_type || 'reply',
      contextRelevant: details.context_relevant || true,
      confidence
    };

    return {
      userId,
      chatId,
      messageId,
      type: 'suggested_response' as AISuggestionType,
      title: `Suggested response`,
      description: `AI-generated response: "${metadata.suggestedText.substring(0, 100)}${metadata.suggestedText.length > 100 ? '...' : ''}"`,
      metadata,
      status: 'pending'
    };
  }

  /**
   * Map confidence string to number
   */
  private mapConfidenceToNumber(confidence: string): number {
    switch (confidence?.toLowerCase()) {
      case 'high': return 0.9;
      case 'medium': return 0.7;
      case 'low': return 0.5;
      default: return 0.7; // Default to medium
    }
  }

  /**
   * Map urgency string to priority level
   */
  private mapUrgencyToPriority(urgency: string): number {
    switch (urgency?.toLowerCase()) {
      case 'high': return 5;
      case 'medium': return 3;
      case 'low': return 1;
      default: return 3; // Default to medium
    }
  }

  /**
   * Get priority title based on level
   */
  private getPriorityTitle(priorityLevel: number): string {
    if (priorityLevel >= 5) return 'Critical';
    if (priorityLevel >= 4) return 'High';
    if (priorityLevel >= 3) return 'Medium';
    if (priorityLevel >= 2) return 'Low';
    return 'Very Low';
  }

  /**
   * Batch create suggestions in Firestore with optimized performance
   */
  async createSuggestionsInFirestore(suggestions: CreateAISuggestion[]): Promise<Result<any[]>> {
    try {
      console.log('💾 N8nResponseParserService: Batch creating suggestions in Firestore');
      console.log('📊 Suggestion count:', suggestions.length);

      if (suggestions.length === 0) {
        console.log('📭 No suggestions to create');
        return {
          success: true,
          data: []
        };
      }

      // Use Firestore batch operations for better performance
      if (suggestions.length <= 500) { // Firestore batch limit
        return await this.createSuggestionsBatch(suggestions);
      } else {
        // Split into chunks for large batches
        return await this.createSuggestionsInChunks(suggestions);
      }

    } catch (error: any) {
      console.error('❌ N8nResponseParserService: Error creating suggestions in Firestore:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to create suggestions in Firestore',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Create suggestions using Firestore batch operations
   */
  private async createSuggestionsBatch(suggestions: CreateAISuggestion[]): Promise<Result<any[]>> {
    try {
      console.log('📦 Creating suggestions using Firestore batch operations');
      
      // Use the batch update method from aiSuggestionService
      const batchUpdates = suggestions.map(suggestion => ({
        id: '', // Will be generated by Firestore
        updates: suggestion
      }));

      // For batch creation, we need to use individual creates since batch updates require existing documents
      const results = [];
      const batchSize = 50; // Process in smaller batches for better reliability
      
      for (let i = 0; i < suggestions.length; i += batchSize) {
        const batch = suggestions.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(suggestions.length / batchSize)}`);
        
        const batchResults = await Promise.allSettled(
          batch.map(suggestion => aiSuggestionService.createSuggestion(suggestion))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            if (result.value.success) {
              console.log(`✅ Created suggestion: ${batch[index].title}`);
            } else {
              console.error(`❌ Failed to create suggestion: ${batch[index].title}`, result.value.error);
            }
          } else {
            console.error(`❌ Promise rejected for suggestion: ${batch[index].title}`, result.reason);
            results.push({
              success: false,
              error: createError({
                type: 'firebase',
                message: result.reason?.message || 'Promise rejected',
                originalError: result.reason
              }),
              retryable: true
            });
          }
        });

        // Small delay between batches to avoid overwhelming Firestore
        if (i + batchSize < suggestions.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      console.log(`🎉 N8nResponseParserService: Batch creation completed`);
      console.log(`✅ Success: ${successCount}/${suggestions.length}`);
      console.log(`❌ Failures: ${failureCount}/${suggestions.length}`);

      return {
        success: true,
        data: results
      };

    } catch (error: any) {
      console.error('❌ Error in batch creation:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to create suggestions batch',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Create suggestions in chunks for large batches
   */
  private async createSuggestionsInChunks(suggestions: CreateAISuggestion[]): Promise<Result<any[]>> {
    try {
      console.log('📦 Creating suggestions in chunks (large batch)');
      
      const chunkSize = 100;
      const chunks = [];
      
      for (let i = 0; i < suggestions.length; i += chunkSize) {
        chunks.push(suggestions.slice(i, i + chunkSize));
      }

      console.log(`📊 Processing ${chunks.length} chunks of ${chunkSize} suggestions each`);

      const allResults = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} suggestions)`);
        
        const chunkResult = await this.createSuggestionsBatch(chunk);
        if (chunkResult.success) {
          allResults.push(...chunkResult.data);
        } else {
          console.error(`❌ Chunk ${i + 1} failed:`, chunkResult.error);
          // Add failed results for this chunk
          chunk.forEach(() => {
            allResults.push({
              success: false,
              error: chunkResult.error,
              retryable: chunkResult.error?.retryable || true
            });
          });
        }

        // Delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const successCount = allResults.filter(r => r.success).length;
      console.log(`🎉 N8nResponseParserService: Chunked creation completed`);
      console.log(`✅ Total success: ${successCount}/${suggestions.length}`);

      return {
        success: true,
        data: allResults
      };

    } catch (error: any) {
      console.error('❌ Error in chunked creation:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to create suggestions in chunks',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Handle malformed n8n responses with comprehensive error handling
   */
  async handleMalformedResponse(
    rawResponse: any,
    userId: string,
    chatId: string,
    messageId: string
  ): Promise<Result<{ suggestions: CreateAISuggestion[]; results: any[]; recoveryInfo: any }>> {
    const startTime = Date.now();
    
    try {
      this.serviceLogger.warn('Handling potentially malformed n8n response', {
        responseType: typeof rawResponse,
        responseLength: Array.isArray(rawResponse) ? rawResponse.length : 'not array',
        userId,
        chatId,
        messageId,
        timestamp: new Date().toISOString()
      });

      // Log the raw response for debugging
      this.serviceLogger.debug('Raw malformed response', rawResponse);

      const recoveryInfo = {
        originalResponseType: typeof rawResponse,
        originalResponseLength: Array.isArray(rawResponse) ? rawResponse.length : 'not array',
        recoveryAttempts: [],
        finalResponse: null
      };

      let processedResponse: N8nActualResponse[] = [];

      // Attempt 1: Direct processing if it's already an array
      if (Array.isArray(rawResponse)) {
        recoveryInfo.recoveryAttempts.push('direct_array_processing');
        processedResponse = rawResponse;
        this.serviceLogger.info('Response is already an array, processing directly');
      }
      // Attempt 2: Extract from common n8n response structures
      else if (rawResponse && typeof rawResponse === 'object') {
        recoveryInfo.recoveryAttempts.push('object_extraction');
        
        // Try to extract from webhook response structure
        if (rawResponse.body && Array.isArray(rawResponse.body)) {
          processedResponse = rawResponse.body;
          this.serviceLogger.info('Extracted response from webhook body');
        }
        // Try to extract from message structure
        else if (rawResponse.message && Array.isArray(rawResponse.message)) {
          processedResponse = rawResponse.message;
          this.serviceLogger.info('Extracted response from message field');
        }
        // Try to extract from data structure
        else if (rawResponse.data && Array.isArray(rawResponse.data)) {
          processedResponse = rawResponse.data;
          this.serviceLogger.info('Extracted response from data field');
        }
        // Try to extract from results structure
        else if (rawResponse.results && Array.isArray(rawResponse.results)) {
          processedResponse = rawResponse.results;
          this.serviceLogger.info('Extracted response from results field');
        }
        // Try to wrap single object in array
        else if (rawResponse.message && rawResponse.message.role === 'assistant') {
          processedResponse = [rawResponse];
          this.serviceLogger.info('Wrapped single response object in array');
        }
        else {
          this.serviceLogger.error('Unable to extract response from object structure', {
            availableKeys: Object.keys(rawResponse),
            objectStructure: JSON.stringify(rawResponse, null, 2)
          });
          return {
            success: false,
            error: createError({
              type: 'malformed_response',
              message: 'Unable to extract valid response from malformed n8n response',
              originalError: new Error('Response structure not recognized')
            }),
            retryable: false
          };
        }
      }
      // Attempt 3: Try to parse as JSON string
      else if (typeof rawResponse === 'string') {
        recoveryInfo.recoveryAttempts.push('json_string_parsing');
        
        try {
          const parsed = JSON.parse(rawResponse);
          if (Array.isArray(parsed)) {
            processedResponse = parsed;
            this.serviceLogger.info('Successfully parsed JSON string as array');
          } else if (parsed && typeof parsed === 'object') {
            // Recursively try to extract from parsed object
            const extractionResult = await this.extractResponseFromObject(parsed);
            if (extractionResult.success) {
              processedResponse = extractionResult.data;
              this.serviceLogger.info('Successfully extracted response from parsed JSON object');
            } else {
              throw new Error('Unable to extract response from parsed JSON');
            }
          } else {
            throw new Error('Parsed JSON is not an object or array');
          }
        } catch (parseError: any) {
          this.serviceLogger.error('Failed to parse JSON string', {
            error: parseError.message,
            stringLength: rawResponse.length,
            stringPreview: rawResponse.substring(0, 200)
          });
          return {
            success: false,
            error: createError({
              type: 'malformed_response',
              message: 'Failed to parse JSON string response',
              originalError: parseError
            }),
            retryable: false
          };
        }
      }
      else {
        this.serviceLogger.error('Unrecognized response type', {
          responseType: typeof rawResponse,
          responseValue: rawResponse
        });
        return {
          success: false,
          error: createError({
            type: 'malformed_response',
            message: `Unrecognized response type: ${typeof rawResponse}`,
            originalError: new Error('Response type not supported')
          }),
          retryable: false
        };
      }

      recoveryInfo.finalResponse = processedResponse;

      // Validate the recovered response
      const validation = this.validateN8nResponse(processedResponse);
      if (!validation.valid) {
        this.serviceLogger.error('Recovered response failed validation', {
          errors: validation.errors,
          recoveredResponse: processedResponse
        });
        return {
          success: false,
          error: createError({
            type: 'malformed_response',
            message: `Recovered response failed validation: ${validation.errors.join(', ')}`,
            originalError: new Error('Validation failed after recovery')
          }),
          retryable: false
        };
      }

      // Process the recovered response
      const parseResult = await this.parseAndCreateSuggestions(processedResponse, userId, chatId, messageId);
      if (!parseResult.success) {
        return parseResult;
      }

      const suggestions = parseResult.data;
      if (suggestions.length === 0) {
        this.serviceLogger.info('No suggestions generated from recovered response');
        return {
          success: true,
          data: {
            suggestions: [],
            results: [],
            recoveryInfo
          }
        };
      }

      // Create suggestions in Firestore
      const createResult = await this.createSuggestionsInFirestore(suggestions);
      if (!createResult.success) {
        return createResult;
      }

      const successCount = createResult.data.filter(r => r.success).length;
      const processingTime = Date.now() - startTime;

      this.serviceLogger.success('Malformed response recovery completed', {
        processingTimeMs: processingTime,
        recoveryAttempts: recoveryInfo.recoveryAttempts,
        generatedSuggestions: suggestions.length,
        createdSuggestions: successCount,
        userId,
        chatId,
        messageId
      });

      return {
        success: true,
        data: {
          suggestions,
          results: createResult.data,
          recoveryInfo
        }
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      this.serviceLogger.error('Critical error during malformed response handling', {
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
        userId,
        chatId,
        messageId,
        rawResponseType: typeof rawResponse
      });

      return {
        success: false,
        error: createError({
          type: 'malformed_response',
          message: error.message || 'Failed to handle malformed n8n response',
          originalError: error
        }),
        retryable: false
      };
    }
  }

  /**
   * Extract response from object structure
   */
  private async extractResponseFromObject(obj: any): Promise<Result<N8nActualResponse[]>> {
    const extractionPaths = [
      'body',
      'message',
      'data',
      'results',
      'response',
      'payload',
      'content'
    ];

    for (const path of extractionPaths) {
      if (obj[path] && Array.isArray(obj[path])) {
        return {
          success: true,
          data: obj[path]
        };
      }
    }

    // If no array found, try to wrap the object
    if (obj.message && obj.message.role === 'assistant') {
      return {
        success: true,
        data: [obj]
      };
    }

    return {
      success: false,
      error: createError({
        type: 'extraction',
        message: 'Unable to extract response from object',
        originalError: new Error('No valid response structure found')
      }),
      retryable: false
    };
  }

  /**
   * Process n8n response and create suggestions in one operation
   */
  async processN8nResponseAndCreateSuggestions(
    n8nResponse: N8nActualResponse[],
    userId: string,
    chatId: string,
    messageId: string
  ): Promise<Result<{ suggestions: CreateAISuggestion[]; results: any[] }>> {
    try {
      this.serviceLogger.info('Processing response and creating suggestions');
      
      // Parse the response
      const parseResult = await this.parseAndCreateSuggestions(n8nResponse, userId, chatId, messageId);
      if (!parseResult.success) {
        return parseResult;
      }

      const suggestions = parseResult.data;
      if (suggestions.length === 0) {
        this.serviceLogger.info('No suggestions generated from n8n response');
        return {
          success: true,
          data: {
            suggestions: [],
            results: []
          }
        };
      }

      // Create suggestions in Firestore
      const createResult = await this.createSuggestionsInFirestore(suggestions);
      if (!createResult.success) {
        return createResult;
      }

      const successCount = createResult.data.filter(r => r.success).length;
      this.serviceLogger.success('Complete processing finished', {
        generatedSuggestions: suggestions.length,
        createdSuggestions: successCount
      });

      return {
        success: true,
        data: {
          suggestions,
          results: createResult.data
        }
      };

    } catch (error: any) {
      this.serviceLogger.error('Error in complete processing', error);
      return {
        success: false,
        error: createError({
          type: 'processing',
          message: error.message || 'Failed to process n8n response and create suggestions',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Validate input parameters
   */
  private validateInputParameters(userId: string, chatId: string, messageId: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      errors.push('userId must be a non-empty string');
    }

    if (!chatId || typeof chatId !== 'string' || chatId.trim().length === 0) {
      errors.push('chatId must be a non-empty string');
    }

    if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
      errors.push('messageId must be a non-empty string');
    }

    // Validate ID formats (basic check)
    if (userId && !/^[a-zA-Z0-9_-]+$/.test(userId)) {
      errors.push('userId contains invalid characters');
    }

    if (chatId && !/^[a-zA-Z0-9_-]+$/.test(chatId)) {
      errors.push('chatId contains invalid characters');
    }

    if (messageId && !/^[a-zA-Z0-9_-]+$/.test(messageId)) {
      errors.push('messageId contains invalid characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate n8n response structure
   */
  private validateN8nResponse(response: N8nActualResponse[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(response)) {
      errors.push('Response must be an array');
      return { valid: false, errors };
    }

    if (response.length === 0) {
      errors.push('Response array cannot be empty');
    }

    if (response.length > 10) {
      errors.push('Response array too large (max 10 items)');
    }

    // Check for required structure in each item
    response.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Item ${index} must be an object`);
        return;
      }

      if (!item.message || typeof item.message !== 'object') {
        errors.push(`Item ${index} must have a message object`);
        return;
      }

      if (item.message.role !== 'assistant') {
        errors.push(`Item ${index} message role must be 'assistant'`);
      }

      if (!item.message.content || typeof item.message.content !== 'object') {
        errors.push(`Item ${index} message must have content object`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual response item
   */
  private validateResponseItem(item: N8nActualResponse): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!item.message?.content) {
      errors.push('Missing message content');
      return { valid: false, errors };
    }

    const content = item.message.content;

    // Validate required fields
    if (!content.chat_id || typeof content.chat_id !== 'string') {
      errors.push('Missing or invalid chat_id');
    }

    if (!content.message_id || typeof content.message_id !== 'string') {
      errors.push('Missing or invalid message_id');
    }

    if (typeof content.is_actionable !== 'boolean') {
      errors.push('Missing or invalid is_actionable field');
    }

    // Validate categories
    if (!Array.isArray(content.categories)) {
      errors.push('Categories must be an array');
    } else if (content.categories.length === 0) {
      errors.push('Categories array cannot be empty');
    } else if (content.categories.length > 5) {
      errors.push('Too many categories (max 5)');
    }

    // Validate confidence
    if (content.confidence && !['high', 'medium', 'low'].includes(content.confidence)) {
      errors.push('Invalid confidence value');
    }

    // Validate reasoning length
    if (content.reasoning && content.reasoning.length > 1000) {
      errors.push('Reasoning too long (max 1000 characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate category string
   */
  private isValidCategory(category: string): boolean {
    const validCategories = [
      'CALENDAR_EVENT',
      'DECISION',
      'PRIORITY',
      'RSVP',
      'DEADLINE',
      'SUGGESTED_RESPONSE'
    ];
    return validCategories.includes(category);
  }

  /**
   * Sanitize reasoning text
   */
  private sanitizeReasoning(reasoning: string): string {
    if (!reasoning || typeof reasoning !== 'string') {
      return '';
    }

    // Remove potentially harmful content
    return reasoning
      .trim()
      .substring(0, 1000) // Limit length
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  /**
   * Sanitize extracted details
   */
  private sanitizeExtractedDetails(details: any): any {
    if (!details || typeof details !== 'object') {
      return {};
    }

    const sanitized: any = {};

    // Sanitize string fields
    const stringFields = [
      'date', 'time', 'location', 'action_required', 'urgency',
      'decision_topic', 'event_title', 'task_title', 'suggested_text',
      'response_tone', 'response_type'
    ];

    stringFields.forEach(field => {
      if (details[field] && typeof details[field] === 'string') {
        sanitized[field] = details[field].trim().substring(0, 500);
      }
    });

    // Sanitize array fields
    const arrayFields = [
      'people_mentioned', 'decision_options', 'stakeholders',
      'expected_attendees', 'responded_attendees', 'pending_responses',
      'missing_information'
    ];

    arrayFields.forEach(field => {
      if (Array.isArray(details[field])) {
        sanitized[field] = details[field]
          .filter(item => typeof item === 'string')
          .map(item => item.trim().substring(0, 200))
          .slice(0, 20); // Limit array size
      }
    });

    // Sanitize date fields
    if (details.deadline) {
      try {
        const date = new Date(details.deadline);
        if (!isNaN(date.getTime())) {
          sanitized.deadline = date.toISOString();
        }
      } catch {
        // Invalid date, skip
      }
    }

    if (details.rsvp_deadline) {
      try {
        const date = new Date(details.rsvp_deadline);
        if (!isNaN(date.getTime())) {
          sanitized.rsvp_deadline = date.toISOString();
        }
      } catch {
        // Invalid date, skip
      }
    }

    return sanitized;
  }

  /**
   * Validate created suggestion
   */
  private validateCreatedSuggestion(suggestion: CreateAISuggestion): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!suggestion.userId || typeof suggestion.userId !== 'string') {
      errors.push('Missing userId');
    }

    if (!suggestion.chatId || typeof suggestion.chatId !== 'string') {
      errors.push('Missing chatId');
    }

    if (!suggestion.messageId || typeof suggestion.messageId !== 'string') {
      errors.push('Missing messageId');
    }

    if (!suggestion.type || typeof suggestion.type !== 'string') {
      errors.push('Missing type');
    }

    if (!suggestion.title || typeof suggestion.title !== 'string') {
      errors.push('Missing title');
    }

    if (!suggestion.description || typeof suggestion.description !== 'string') {
      errors.push('Missing description');
    }

    if (!suggestion.metadata || typeof suggestion.metadata !== 'object') {
      errors.push('Missing metadata');
    }

    // Validate field lengths
    if (suggestion.title && suggestion.title.length > 200) {
      errors.push('Title too long (max 200 characters)');
    }

    if (suggestion.description && suggestion.description.length > 1000) {
      errors.push('Description too long (max 1000 characters)');
    }

    // Validate metadata confidence
    if (suggestion.metadata?.confidence !== undefined) {
      const conf = suggestion.metadata.confidence;
      if (typeof conf !== 'number' || conf < 0 || conf > 1) {
        errors.push('Invalid confidence value (must be 0-1)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const n8nResponseParserService = new N8nResponseParserService();

export default n8nResponseParserService;
