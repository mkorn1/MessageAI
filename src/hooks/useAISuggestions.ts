/**
 * useAISuggestions Hook
 * 
 * This hook provides functionality to manage AI suggestions with real-time updates.
 * It handles fetching, filtering, updating, and real-time listening for AI suggestions
 * from Firestore, with proper state management and error handling.
 */

import { collection, limit, onSnapshot, orderBy, query, Unsubscribe, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../contexts/AuthContext';
import aiSuggestionService from '../services/aiSuggestionService';
import {
    AISuggestion,
    AISuggestionStatus,
    AISuggestionType,
    SuggestionQueryOptions,
    SuggestionStats,
    UpdateAISuggestion
} from '../types/aiSuggestion';
import { Result } from '../types/errors';

interface UseAISuggestionsOptions {
  // Filtering options
  status?: AISuggestionStatus;
  type?: AISuggestionType;
  chatId?: string;
  
  // Pagination options
  limit?: number;
  
  // Real-time options
  enableRealtime?: boolean;
  
  // Callbacks
  onSuggestionUpdate?: (suggestion: AISuggestion) => void;
  onSuggestionCreate?: (suggestion: AISuggestion) => void;
  onSuggestionDelete?: (suggestionId: string) => void;
  onError?: (error: string) => void;
}

interface UseAISuggestionsReturn {
  // Data
  suggestions: AISuggestion[];
  stats: SuggestionStats | null;
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  updating: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
  updateSuggestion: (suggestionId: string, updates: UpdateAISuggestion) => Promise<Result<AISuggestion>>;
  deleteSuggestion: (suggestionId: string) => Promise<Result<void>>;
  batchUpdateSuggestions: (updates: Array<{ id: string; updates: UpdateAISuggestion }>) => Promise<Result<void>>;
  
  // Utility functions
  getSuggestionsByType: (type: AISuggestionType) => AISuggestion[];
  getSuggestionsByStatus: (status: AISuggestionStatus) => AISuggestion[];
  getPendingSuggestionsCount: () => number;
  clearError: () => void;
}

export const useAISuggestions = (
  options: UseAISuggestionsOptions = {}
): UseAISuggestionsReturn => {
  const {
    status = AISuggestionStatus.Pending,
    type,
    chatId,
    limit: limitCount = 50,
    enableRealtime = false, // EMERGENCY FIX: Temporarily disable to stop infinite loops
    onSuggestionUpdate,
    onSuggestionCreate,
    onSuggestionDelete,
    onError,
  } = options;

  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [stats, setStats] = useState<SuggestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Map Firestore document to AISuggestion
   */
  const mapDocumentToSuggestion = useCallback((doc: any): AISuggestion => {
    const data = doc.data();
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
  }, []);

  /**
   * Load suggestions from Firestore
   */
  const loadSuggestions = useCallback(async (isRefresh = false) => {
    if (!user?.uid) {
      console.log('🔍 useAISuggestions: No authenticated user, skipping load');
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('🔍 useAISuggestions: Loading suggestions');
      console.log('👤 User ID:', user.uid);
      console.log('📋 Status filter:', status);
      console.log('📋 Type filter:', type);
      console.log('📋 Chat filter:', chatId);

      const queryOptions: SuggestionQueryOptions = {
        limit: limitCount,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      };

      // Add filters
      if (status) queryOptions.status = status;
      if (type) queryOptions.type = type;
      if (chatId) queryOptions.chatId = chatId;

      const result = await aiSuggestionService.getSuggestions(user.uid, queryOptions);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load suggestions');
      }

      const loadedSuggestions = result.data || [];
      
      if (isMountedRef.current) {
        setSuggestions(loadedSuggestions);
        console.log(`✅ Loaded ${loadedSuggestions.length} suggestions`);
      }

    } catch (err: any) {
      console.error('❌ useAISuggestions: Error loading suggestions:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load suggestions');
        onError?.(err.message || 'Failed to load suggestions');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.uid, status, type, chatId, limitCount, onError]);

  /**
   * Load suggestion statistics
   */
  const loadStats = useCallback(async () => {
    if (!user?.uid) return;

    try {
      console.log('📊 useAISuggestions: Loading suggestion stats');
      
      const result = await aiSuggestionService.getSuggestionStats(user.uid);
      
      if (result.success && result.data && isMountedRef.current) {
        setStats(result.data);
        console.log('✅ Loaded suggestion stats:', result.data);
      }
    } catch (err: any) {
      console.error('❌ useAISuggestions: Error loading stats:', err);
    }
  }, [user?.uid]);

  /**
   * Set up real-time listener
   */
  const setupRealtimeListener = useCallback(() => {
    if (!user?.uid || !enableRealtime) {
      console.log('🔍 useAISuggestions: Skipping real-time listener setup');
      return;
    }

    // Clean up existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      console.log('👂 useAISuggestions: Setting up real-time listener');

      // Build query
      let q = query(
        collection(db, 'aiSuggestions'),
        where('userId', '==', user.uid)
      );

      // Add status filter
      if (status) {
        q = query(q, where('status', '==', status));
      }

      // Add type filter
      if (type) {
        q = query(q, where('type', '==', type));
      }

      // Add chat filter
      if (chatId) {
        q = query(q, where('chatId', '==', chatId));
      }

      // Add ordering and limit
      q = query(q, orderBy('createdAt', 'desc'), limit(limitCount));

      // Set up listener
      unsubscribeRef.current = onSnapshot(
        q,
        (snapshot) => {
          if (!isMountedRef.current) return;

          console.log('🔄 useAISuggestions: Real-time update received');
          console.log('📊 Changes:', snapshot.docChanges().length);

          const updatedSuggestions: AISuggestion[] = [];
          const changes = snapshot.docChanges();

          changes.forEach((change) => {
            const suggestion = mapDocumentToSuggestion(change.doc);

            switch (change.type) {
              case 'added':
                console.log('➕ New suggestion added:', suggestion.id);
                updatedSuggestions.push(suggestion);
                onSuggestionCreate?.(suggestion);
                break;
              case 'modified':
                console.log('✏️ Suggestion updated:', suggestion.id);
                updatedSuggestions.push(suggestion);
                onSuggestionUpdate?.(suggestion);
                break;
              case 'removed':
                console.log('🗑️ Suggestion removed:', suggestion.id);
                onSuggestionDelete?.(suggestion.id);
                break;
            }
          });

          // Update state with all current suggestions
          const allSuggestions = snapshot.docs.map(mapDocumentToSuggestion);
          setSuggestions(allSuggestions);

          console.log(`✅ Real-time update complete: ${allSuggestions.length} suggestions`);
        },
        (err) => {
          console.error('❌ useAISuggestions: Real-time listener error:', err);
          if (isMountedRef.current) {
            setError('Real-time updates failed');
            onError?.('Real-time updates failed');
          }
        }
      );

      console.log('✅ Real-time listener set up successfully');

    } catch (err: any) {
      console.error('❌ useAISuggestions: Error setting up real-time listener:', err);
      if (isMountedRef.current) {
        setError('Failed to set up real-time updates');
        onError?.('Failed to set up real-time updates');
      }
    }
  }, [user?.uid, enableRealtime, status, type, chatId, limitCount, mapDocumentToSuggestion, onSuggestionCreate, onSuggestionUpdate, onSuggestionDelete, onError]);

  /**
   * Refresh suggestions manually
   */
  const refresh = useCallback(async () => {
    await loadSuggestions(true);
    await loadStats();
  }, [loadSuggestions, loadStats]);

  /**
   * Update a single suggestion
   */
  const updateSuggestion = useCallback(async (
    suggestionId: string,
    updates: UpdateAISuggestion
  ): Promise<Result<AISuggestion>> => {
    try {
      setUpdating(true);
      console.log('✏️ useAISuggestions: Updating suggestion');
      console.log('🆔 Suggestion ID:', suggestionId);
      console.log('📝 Updates:', Object.keys(updates));

      const result = await aiSuggestionService.updateSuggestion(suggestionId, updates);

      if (result.success && result.data) {
        console.log('✅ Suggestion updated successfully');
        
        // Update local state
        setSuggestions(prev => 
          prev.map(s => s.id === suggestionId ? result.data! : s)
        );
      }

      return result;

    } catch (err: any) {
      console.error('❌ useAISuggestions: Error updating suggestion:', err);
      return {
        success: false,
        error: {
          type: 'update',
          message: err.message || 'Failed to update suggestion',
          originalError: err
        },
        retryable: true
      };
    } finally {
      setUpdating(false);
    }
  }, []);

  /**
   * Delete a suggestion
   */
  const deleteSuggestion = useCallback(async (suggestionId: string): Promise<Result<void>> => {
    try {
      setUpdating(true);
      console.log('🗑️ useAISuggestions: Deleting suggestion');
      console.log('🆔 Suggestion ID:', suggestionId);

      const result = await aiSuggestionService.deleteSuggestion(suggestionId);

      if (result.success) {
        console.log('✅ Suggestion deleted successfully');
        
        // Update local state
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }

      return result;

    } catch (err: any) {
      console.error('❌ useAISuggestions: Error deleting suggestion:', err);
      return {
        success: false,
        error: {
          type: 'delete',
          message: err.message || 'Failed to delete suggestion',
          originalError: err
        },
        retryable: true
      };
    } finally {
      setUpdating(false);
    }
  }, []);

  /**
   * Batch update multiple suggestions
   */
  const batchUpdateSuggestions = useCallback(async (
    updates: Array<{ id: string; updates: UpdateAISuggestion }>
  ): Promise<Result<void>> => {
    try {
      setUpdating(true);
      console.log('📦 useAISuggestions: Batch updating suggestions');
      console.log('📊 Update count:', updates.length);

      const batchUpdates = updates.map(u => ({
        suggestionIds: [u.id],
        updates: u.updates
      }));

      const result = await aiSuggestionService.batchUpdateSuggestions(batchUpdates);

      if (result.success) {
        console.log('✅ Batch update completed successfully');
        
        // Refresh suggestions to get updated data
        await refresh();
      }

      return result;

    } catch (err: any) {
      console.error('❌ useAISuggestions: Error in batch update:', err);
      return {
        success: false,
        error: {
          type: 'batch_update',
          message: err.message || 'Failed to batch update suggestions',
          originalError: err
        },
        retryable: true
      };
    } finally {
      setUpdating(false);
    }
  }, [refresh]);

  /**
   * Get suggestions by type
   */
  const getSuggestionsByType = useCallback((type: AISuggestionType): AISuggestion[] => {
    return suggestions.filter(s => s.type === type);
  }, [suggestions]);

  /**
   * Get suggestions by status
   */
  const getSuggestionsByStatus = useCallback((status: AISuggestionStatus): AISuggestion[] => {
    return suggestions.filter(s => s.status === status);
  }, [suggestions]);

  /**
   * Get count of pending suggestions
   */
  const getPendingSuggestionsCount = useCallback((): number => {
    return suggestions.filter(s => s.status === AISuggestionStatus.Pending).length;
  }, [suggestions]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initial load and setup - CRITICAL FIX: Remove function dependencies to prevent infinite loop
   */
  useEffect(() => {
    if (user?.uid) {
      const initializeData = async () => {
        await loadSuggestions();
        await loadStats();
        setupRealtimeListener();
      };
      initializeData();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user?.uid]); // CRITICAL FIX: Remove function dependencies

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    // Data
    suggestions,
    stats,
    
    // Loading states
    loading,
    refreshing,
    updating,
    
    // Error state
    error,
    
    // Actions
    refresh,
    updateSuggestion,
    deleteSuggestion,
    batchUpdateSuggestions,
    
    // Utility functions
    getSuggestionsByType,
    getSuggestionsByStatus,
    getPendingSuggestionsCount,
    clearError,
  };
};

export default useAISuggestions;
