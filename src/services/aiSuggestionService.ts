/**
 * AI Suggestion Service
 * 
 * Handles all Firestore CRUD operations for AI suggestions.
 * Provides methods to create, read, update, and delete suggestions
 * with proper validation and error handling.
 */

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    DocumentSnapshot,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    QueryDocumentSnapshot,
    startAfter,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import { createError, Result } from '../types';
import {
    AISuggestion,
    AISuggestionStatus,
    AISuggestionType,
    BatchSuggestionUpdate,
    CreateAISuggestion,
    SuggestionQueryOptions,
    SuggestionStats,
    UpdateAISuggestion
} from '../types/aiSuggestion';

class AISuggestionService {
  private readonly collectionName = 'aiSuggestions';

  /**
   * Create a new AI suggestion
   */
  async createSuggestion(suggestion: CreateAISuggestion): Promise<Result<AISuggestion>> {
    try {
      console.log('📝 AISuggestionService: Creating new suggestion');
      console.log('📋 Suggestion type:', suggestion.type);
      console.log('👤 User ID:', suggestion.userId);

      // Validate suggestion data
      const validation = this.validateSuggestionData(suggestion);
      if (!validation.valid) {
        return {
          success: false,
          error: createError({
            type: 'validation',
            message: `Invalid suggestion data: ${validation.errors.join(', ')}`
          }),
          retryable: false
        };
      }

      // Prepare document data
      const docData = {
        ...suggestion,
        status: suggestion.status || 'pending',
        createdAt: Timestamp.now(),
        // Ensure timestamps are properly formatted
        ...(suggestion.confirmedAt && { confirmedAt: Timestamp.fromDate(suggestion.confirmedAt) }),
        ...(suggestion.rejectedAt && { rejectedAt: Timestamp.fromDate(suggestion.rejectedAt) }),
        ...(suggestion.executedAt && { executedAt: Timestamp.fromDate(suggestion.executedAt) })
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, this.collectionName), docData);
      
      // Fetch the created document to return complete data
      const createdDoc = await getDoc(docRef);
      if (!createdDoc.exists()) {
        throw new Error('Failed to retrieve created suggestion');
      }

      const createdSuggestion = this.mapDocumentToSuggestion(createdDoc);
      
      console.log('✅ AISuggestionService: Suggestion created successfully');
      console.log('🆔 Suggestion ID:', createdSuggestion.id);
      
      return {
        success: true,
        data: createdSuggestion
      };

    } catch (error: any) {
      console.error('❌ AISuggestionService: Error creating suggestion:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to create suggestion',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Get a single suggestion by ID
   */
  async getSuggestion(suggestionId: string): Promise<Result<AISuggestion | null>> {
    try {
      console.log('🔍 AISuggestionService: Fetching suggestion');
      console.log('🆔 Suggestion ID:', suggestionId);

      const docRef = doc(db, this.collectionName, suggestionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('📭 AISuggestionService: Suggestion not found');
        return {
          success: true,
          data: null
        };
      }

      const suggestion = this.mapDocumentToSuggestion(docSnap);
      
      console.log('✅ AISuggestionService: Suggestion fetched successfully');
      return {
        success: true,
        data: suggestion
      };

    } catch (error: any) {
      console.error('❌ AISuggestionService: Error fetching suggestion:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to fetch suggestion',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Get suggestions with filtering and pagination
   */
  async getSuggestions(
    userId: string, 
    options: SuggestionQueryOptions = {}
  ): Promise<Result<AISuggestion[]>> {
    try {
      console.log('🔍 AISuggestionService: Fetching suggestions');
      console.log('👤 User ID:', userId);
      console.log('📋 Options:', options);

      // Build query
      let q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      // Add status filter
      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      // Add type filter
      if (options.type) {
        q = query(q, where('type', '==', options.type));
      }

      // Add chat filter
      if (options.chatId) {
        q = query(q, where('chatId', '==', options.chatId));
      }

      // Add ordering
      const orderField = options.orderBy || 'createdAt';
      const orderDirection = options.orderDirection || 'desc';
      q = query(q, orderBy(orderField, orderDirection));

      // Add pagination
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      if (options.startAfter) {
        q = query(q, startAfter(options.startAfter));
      }

      // Execute query
      const querySnapshot = await getDocs(q);
      const suggestions: AISuggestion[] = [];

      querySnapshot.forEach((doc) => {
        suggestions.push(this.mapDocumentToSuggestion(doc));
      });

      console.log(`✅ AISuggestionService: Fetched ${suggestions.length} suggestions`);
      return {
        success: true,
        data: suggestions
      };

    } catch (error: any) {
      console.error('❌ AISuggestionService: Error fetching suggestions:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to fetch suggestions',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Update a suggestion
   */
  async updateSuggestion(
    suggestionId: string, 
    updates: UpdateAISuggestion
  ): Promise<Result<AISuggestion>> {
    try {
      console.log('✏️ AISuggestionService: Updating suggestion');
      console.log('🆔 Suggestion ID:', suggestionId);
      console.log('📝 Updates:', Object.keys(updates));

      // Validate updates
      const validation = this.validateUpdateData(updates);
      if (!validation.valid) {
        return {
          success: false,
          error: createError({
            type: 'validation',
            message: `Invalid update data: ${validation.errors.join(', ')}`
          }),
          retryable: false
        };
      }

      // Prepare update data with proper timestamp handling
      const updateData: any = { ...updates };
      
      if (updates.confirmedAt) {
        updateData.confirmedAt = Timestamp.fromDate(updates.confirmedAt);
      }
      if (updates.rejectedAt) {
        updateData.rejectedAt = Timestamp.fromDate(updates.rejectedAt);
      }
      if (updates.executedAt) {
        updateData.executedAt = Timestamp.fromDate(updates.executedAt);
      }

      // Update document
      const docRef = doc(db, this.collectionName, suggestionId);
      await updateDoc(docRef, updateData);

      // Fetch updated document
      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error('Failed to retrieve updated suggestion');
      }

      const updatedSuggestion = this.mapDocumentToSuggestion(updatedDoc);
      
      console.log('✅ AISuggestionService: Suggestion updated successfully');
      return {
        success: true,
        data: updatedSuggestion
      };

    } catch (error: any) {
      console.error('❌ AISuggestionService: Error updating suggestion:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to update suggestion',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Delete a suggestion
   */
  async deleteSuggestion(suggestionId: string): Promise<Result<void>> {
    try {
      console.log('🗑️ AISuggestionService: Deleting suggestion');
      console.log('🆔 Suggestion ID:', suggestionId);

      const docRef = doc(db, this.collectionName, suggestionId);
      await deleteDoc(docRef);

      console.log('✅ AISuggestionService: Suggestion deleted successfully');
      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      console.error('❌ AISuggestionService: Error deleting suggestion:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to delete suggestion',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Batch update multiple suggestions
   */
  async batchUpdateSuggestions(updates: BatchSuggestionUpdate[]): Promise<Result<void>> {
    try {
      console.log('📦 AISuggestionService: Batch updating suggestions');
      console.log('📊 Update count:', updates.length);

      if (updates.length === 0) {
        return {
          success: true,
          data: undefined
        };
      }

      // Firestore batch limit is 500 operations
      if (updates.length > 500) {
        return {
          success: false,
          error: createError({
            type: 'validation',
            message: 'Batch size exceeds Firestore limit of 500 operations'
          }),
          retryable: false
        };
      }

      const batch = writeBatch(db);

      for (const update of updates) {
        const docRef = doc(db, this.collectionName, update.id);
        
        // Prepare update data with proper timestamp handling
        const updateData: any = { ...update.updates };
        
        if (update.updates.confirmedAt) {
          updateData.confirmedAt = Timestamp.fromDate(update.updates.confirmedAt);
        }
        if (update.updates.rejectedAt) {
          updateData.rejectedAt = Timestamp.fromDate(update.updates.rejectedAt);
        }
        if (update.updates.executedAt) {
          updateData.executedAt = Timestamp.fromDate(update.updates.executedAt);
        }

        batch.update(docRef, updateData);
      }

      await batch.commit();

      console.log('✅ AISuggestionService: Batch update completed successfully');
      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      console.error('❌ AISuggestionService: Error in batch update:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to batch update suggestions',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Get suggestion statistics for a user
   */
  async getSuggestionStats(userId: string): Promise<Result<SuggestionStats>> {
    try {
      console.log('📊 AISuggestionService: Fetching suggestion stats');
      console.log('👤 User ID:', userId);

      // Get all suggestions for the user
      const result = await this.getSuggestions(userId, { limit: 1000 }); // Large limit to get all
      if (!result.success) {
        return result;
      }

      const suggestions = result.data;
      const stats: SuggestionStats = {
        total: suggestions.length,
        pending: 0,
        confirmed: 0,
        rejected: 0,
        executed: 0,
        byType: {}
      };

      // Count by status and type
      suggestions.forEach(suggestion => {
        stats[suggestion.status]++;
        
        if (!stats.byType[suggestion.type]) {
          stats.byType[suggestion.type] = 0;
        }
        stats.byType[suggestion.type]++;
      });

      console.log('✅ AISuggestionService: Stats calculated successfully');
      console.log('📈 Stats:', stats);
      
      return {
        success: true,
        data: stats
      };

    } catch (error: any) {
      console.error('❌ AISuggestionService: Error calculating stats:', error);
      return {
        success: false,
        error: createError({
          type: 'firebase',
          message: error.message || 'Failed to calculate suggestion stats',
          originalError: error
        }),
        retryable: true
      };
    }
  }

  /**
   * Map Firestore document to AISuggestion object
   */
  private mapDocumentToSuggestion(doc: DocumentSnapshot | QueryDocumentSnapshot): AISuggestion {
    const data = doc.data()!;
    
    return {
      id: doc.id,
      userId: data.userId,
      chatId: data.chatId,
      messageId: data.messageId,
      type: data.type as AISuggestionType,
      status: data.status as AISuggestionStatus,
      title: data.title,
      description: data.description,
      metadata: data.metadata,
      createdAt: data.createdAt?.toDate() || new Date(),
      confirmedAt: data.confirmedAt?.toDate(),
      rejectedAt: data.rejectedAt?.toDate(),
      executedAt: data.executedAt?.toDate(),
      executionResult: data.executionResult
    };
  }

  /**
   * Validate suggestion data before creation
   */
  private validateSuggestionData(suggestion: CreateAISuggestion): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!suggestion.userId) errors.push('userId is required');
    if (!suggestion.chatId) errors.push('chatId is required');
    if (!suggestion.messageId) errors.push('messageId is required');
    if (!suggestion.type) errors.push('type is required');
    if (!suggestion.title) errors.push('title is required');
    if (!suggestion.description) errors.push('description is required');
    if (!suggestion.metadata) errors.push('metadata is required');

    if (suggestion.title && suggestion.title.length > 200) {
      errors.push('title must be 200 characters or less');
    }
    if (suggestion.description && suggestion.description.length > 1000) {
      errors.push('description must be 1000 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate update data
   */
  private validateUpdateData(updates: UpdateAISuggestion): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (updates.title && updates.title.length > 200) {
      errors.push('title must be 200 characters or less');
    }
    if (updates.description && updates.description.length > 1000) {
      errors.push('description must be 1000 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const aiSuggestionService = new AISuggestionService();

export default aiSuggestionService;
