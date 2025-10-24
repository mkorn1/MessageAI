import { useCallback, useEffect, useState } from 'react';
import notificationErrorService, { NotificationError, NotificationRetryQueue, RetryConfig } from '../services/notificationErrorService';

interface UseNotificationErrorsReturn {
  errors: NotificationError[];
  retryQueue: NotificationRetryQueue[];
  retryQueueCount: number;
  clearErrors: () => void;
  clearRetryQueue: () => void;
  updateRetryConfig: (config: Partial<RetryConfig>) => void;
  getErrorsByType: (type: NotificationError['type']) => NotificationError[];
}

export const useNotificationErrors = (): UseNotificationErrorsReturn => {
  const [errors, setErrors] = useState<NotificationError[]>([]);
  const [retryQueue, setRetryQueue] = useState<NotificationRetryQueue[]>([]);
  const [retryQueueCount, setRetryQueueCount] = useState(0);

  // Handle error updates
  const handleErrorUpdate = useCallback((error: NotificationError) => {
    setErrors(prev => {
      const existing = prev.find(e => e.id === error.id);
      if (existing) {
        return prev.map(e => e.id === error.id ? error : e);
      }
      return [...prev, error];
    });
  }, []);

  // Handle retry queue updates
  const handleRetryQueueUpdate = useCallback(() => {
    const status = notificationErrorService.getRetryQueueStatus();
    setRetryQueue(status.items);
    setRetryQueueCount(status.count);
  }, []);

  // Set up listeners
  useEffect(() => {
    notificationErrorService.addErrorCallback(handleErrorUpdate);
    
    // Initial load
    setErrors(notificationErrorService.getAllErrors());
    handleRetryQueueUpdate();
    
    // Set up periodic retry queue updates (reduced frequency)
    const interval = setInterval(handleRetryQueueUpdate, 5000);
    
    return () => {
      notificationErrorService.removeErrorCallback(handleErrorUpdate);
      clearInterval(interval);
    };
  }, [handleErrorUpdate, handleRetryQueueUpdate]);

  // Clear errors
  const clearErrors = useCallback(() => {
    notificationErrorService.clearErrors();
    setErrors([]);
  }, []);

  // Clear retry queue
  const clearRetryQueue = useCallback(() => {
    notificationErrorService.clearRetryQueue();
    setRetryQueue([]);
    setRetryQueueCount(0);
  }, []);

  // Update retry configuration
  const updateRetryConfig = useCallback((config: Partial<RetryConfig>) => {
    notificationErrorService.updateRetryConfig(config);
  }, []);

  // Get errors by type
  const getErrorsByType = useCallback((type: NotificationError['type']) => {
    return notificationErrorService.getErrorsByType(type);
  }, []);

  return {
    errors,
    retryQueue,
    retryQueueCount,
    clearErrors,
    clearRetryQueue,
    updateRetryConfig,
    getErrorsByType,
  };
};

export default useNotificationErrors;
