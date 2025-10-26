import { useCallback, useEffect, useRef, useState } from 'react';
import { messageStatusService } from '../services/messageStatus';
import { MessageStatusType } from '../types/messageStatus';

// EMERGENCY FIX: Add loop detection to prevent crashes
let consoleCount = 0;
const throttledLog = (message: string) => {
  consoleCount++;
  if (consoleCount % 10 === 0) { // Only log every 10th occurrence
    console.log(message);
  }
};

export interface MessageWithStatus {
  messageId: string;
  status: MessageStatusType;
}

export const useMessageStatuses = (messageIds: string[]) => {
  const [statuses, setStatuses] = useState<{ [messageId: string]: MessageStatusType }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // EMERGENCY FIX: Add loop detection
  // const renderCount = useRef(0);
  // useEffect(() => {
  //   renderCount.current++;
  //   if (renderCount.current > 10) {
  //     console.error('🚨 INFINITE LOOP DETECTED IN useMessageStatuses - STOPPING');
  //     return;
  //   }
  // });

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
          throttledLog('🔄 Status update applied: ' + JSON.stringify(newStatuses));
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
    // CRITICAL FIX: Don't filter by current statuses to prevent infinite loop
    // Just fetch statuses for all provided messageIds
    if (messageIds.length === 0) {
      setStatuses({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await messageStatusService.getMessageStatuses(messageIds);
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
  }, [messageIds]); // Only depend on messageIds

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Subscribe to status changes
  useEffect(() => {
    // CRITICAL FIX: Don't filter by current statuses to prevent infinite loop
    // Just subscribe to all provided messageIds
    if (messageIds.length === 0) return;

    const unsubscribe = messageStatusService.subscribeToMessageStatuses(
      messageIds, // Subscribe to all messageIds, let the service handle filtering
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
  }, [messageIds, debouncedUpdateStatuses]); // Only depend on messageIds and debouncedUpdateStatuses

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
