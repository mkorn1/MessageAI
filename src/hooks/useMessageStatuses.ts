import { useCallback, useEffect, useRef, useState } from 'react';
import { messageStatusService } from '../services/messageStatus';
import { MessageStatusType } from '../types/messageStatus';

export interface MessageWithStatus {
  messageId: string;
  status: MessageStatusType;
}

export const useMessageStatuses = (messageIds: string[]) => {
  const [statuses, setStatuses] = useState<{ [messageId: string]: MessageStatusType }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter message IDs to only track those that need status updates
  const getRelevantMessageIds = useCallback((allMessageIds: string[]): string[] => {
    // Track all messages for status updates, including READ status for read receipts
    // Only skip messages that are in FAILED state (final error state)
    return allMessageIds.filter(messageId => {
      const currentStatus = statuses[messageId];
      // Track all statuses except FAILED (which is a final error state)
      return currentStatus !== MessageStatusType.FAILED;
    });
  }, [statuses]);

  // Debounced status update function
  const debouncedUpdateStatuses = useCallback((newStatuses: { [messageId: string]: MessageStatusType }) => {
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Set new timeout for debounced update
    updateTimeoutRef.current = setTimeout(() => {
      setStatuses(prev => {
        const updated = { ...prev, ...newStatuses };
        
        // Only update if there are actual changes
        const hasChanges = Object.keys(newStatuses).some(messageId => 
          prev[messageId] !== newStatuses[messageId]
        );
        
        if (hasChanges) {
          console.log('🔄 Status update applied:', newStatuses);
          return updated;
        }
        
        return prev; // No changes, return previous state
      });
    }, 300); // 300ms debounce
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const fetchStatuses = useCallback(async () => {
    const relevantMessageIds = getRelevantMessageIds(messageIds);
    
    if (relevantMessageIds.length === 0) {
      setStatuses({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await messageStatusService.getMessageStatuses(relevantMessageIds);
      if (result.success) {
        const statusMap: { [messageId: string]: MessageStatusType } = {};
        Object.values(result.data).forEach(status => {
          statusMap[status.messageId] = status.status;
        });
        setStatuses(statusMap);
      } else {
        setError(new Error(result.error.message));
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [messageIds, getRelevantMessageIds]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Subscribe to status changes
  useEffect(() => {
    const relevantMessageIds = getRelevantMessageIds(messageIds);
    
    if (relevantMessageIds.length === 0) return;

    const unsubscribe = messageStatusService.subscribeToMessageStatuses(
      relevantMessageIds,
      (newStatuses) => {
        // Convert MessageStatus objects to status map
        const statusMap: { [messageId: string]: MessageStatusType } = {};
        Object.values(newStatuses).forEach(status => {
          statusMap[status.messageId] = status.status;
        });
        
        // Use debounced update instead of immediate update
        debouncedUpdateStatuses(statusMap);
      },
      (err) => {
        setError(err);
      }
    );

    return unsubscribe;
  }, [messageIds, getRelevantMessageIds, debouncedUpdateStatuses]);

  const getStatus = useCallback((messageId: string): MessageStatusType => {
    return statuses[messageId] || MessageStatusType.SENDING;
  }, [statuses]);

  return {
    statuses,
    getStatus,
    loading,
    error,
    refetch: fetchStatuses
  };
};
