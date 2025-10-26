/**
 * n8n Message Analysis Service
 * 
 * Handles storing and retrieving n8n webhook analysis results in Firestore.
 * This service manages the n8n_message_analysis collection which stores
 * the raw analysis responses from n8n before they're converted to suggestions.
 */

import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../../firebase';
import { createError, Result } from '../types';
import { CreateN8nMessageAnalysis, N8nMessageAnalysis } from '../types/n8nMessageAnalysis';
import { logger } from '../utils/logger';

class N8nMessageAnalysisService {
  private readonly collectionName = 'n8n_message_analysis';
  private readonly serviceLogger = logger.createServiceLogger('N8nMessageAnalysis');

  /**
   * Store a new n8n analysis result in Firestore
   */
  async storeAnalysis(analysis: CreateN8nMessageAnalysis): Promise<Result<N8nMessageAnalysis>> {
    try {
      this.serviceLogger.info('Storing new n8n analysis', {
        messageId: analysis.messageId,
        senderId: analysis.senderId
      });

      // Validate analysis data
      const validation = this.validateAnalysis(analysis);
      if (!validation.valid) {
        return {
          success: false,
          error: createError({
            type: 'validation',
            message: `Invalid analysis data: ${validation.errors.join(', ')}`
          }),
          retryable: false
        };
      }

      // Prepare document data
      const docData = {
        ...analysis,
        createdAt: Timestamp.now(),
        processed: analysis.processed || false,
        // Convert Date objects to Timestamps
        ...(analysis.processedAt && { processedAt: Timestamp.fromDate(analysis.processedAt) })
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, this.collectionName), docData);
      
      // Fetch the created document to return complete data
      const createdDoc = await getDoc(docRef);
      if (!createdDoc.exists()) {
        throw new Error('Failed to retrieve created analysis');
      }

      const createdAnalysis = this.mapDocumentToAnalysis(createdDoc);
      
      this.serviceLogger.success('Analysis stored successfully', { analysisId: createdAnalysis.id });
      
      return {
        success: true,
        data: createdAnalysis
      };

    } catch (error: any) {
      this.serviceLogger.error('Error storing analysis', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to store analysis',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Get analysis by message ID
   */
  async getAnalysisByMessageId(messageId: string): Promise<Result<N8nMessageAnalysis | null>> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('messageId', '==', messageId)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return {
          success: true,
          data: null
        };
      }

      // Return the most recent analysis for this message
      const docs = snapshot.docs;
      const mostRecent = docs[0];
      const analysis = this.mapDocumentToAnalysis(mostRecent);

      return {
        success: true,
        data: analysis
      };

    } catch (error: any) {
      this.serviceLogger.error('Error getting analysis by message ID', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to get analysis',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Get unprocessed analyses for a chat
   */
  async getUnprocessedAnalysesForChat(chatId: string): Promise<Result<N8nMessageAnalysis[]>> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('chatId', '==', chatId),
        where('processed', '==', false)
      );

      const snapshot = await getDocs(q);
      const analyses: N8nMessageAnalysis[] = [];
      
      snapshot.forEach((doc) => {
        analyses.push(this.mapDocumentToAnalysis(doc));
      });

      return {
        success: true,
        data: analyses
      };

    } catch (error: any) {
      this.serviceLogger.error('Error getting unprocessed analyses', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to get unprocessed analyses',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Mark analysis as processed
   */
  async markAsProcessed(analysisId: string): Promise<Result<void>> {
    try {
      const analysisRef = doc(db, this.collectionName, analysisId);
      await updateDoc(analysisRef, {
        processed: true,
        processedAt: Timestamp.now()
      });

      this.serviceLogger.info('Analysis marked as processed', { analysisId });
      
      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      this.serviceLogger.error('Error marking analysis as processed', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to mark analysis as processed',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Private helper methods
   */
  private validateAnalysis(analysis: CreateN8nMessageAnalysis): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!analysis.messageId) {
      errors.push('messageId is required');
    }
    if (!analysis.chatId) {
      errors.push('chatId is required');
    }
    if (!analysis.senderId) {
      errors.push('senderId is required');
    }
    if (!analysis.analysisResponse || !Array.isArray(analysis.analysisResponse)) {
      errors.push('analysisResponse must be a non-empty array');
    }
    if (!analysis.chatContext || !Array.isArray(analysis.chatContext)) {
      errors.push('chatContext must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private mapDocumentToAnalysis(docSnapshot: any): N8nMessageAnalysis {
    const data = docSnapshot.data();
    
    return {
      id: docSnapshot.id,
      messageId: data.messageId,
      chatId: data.chatId,
      senderId: data.senderId,
      analysisResponse: data.analysisResponse,
      chatContext: data.chatContext,
      createdAt: data.createdAt?.toDate() || new Date(),
      processed: data.processed || false,
      processedAt: data.processedAt?.toDate()
    };
  }
}

export default new N8nMessageAnalysisService();
