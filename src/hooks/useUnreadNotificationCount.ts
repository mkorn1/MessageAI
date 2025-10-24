import { useCallback, useEffect, useState } from 'react';
import messageNotificationService from '../services/messageNotificationService';
import notificationStorageService from '../services/notificationStorage';

export const useUnreadNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const updateUnreadCount = useCallback(async () => {
    try {
      const count = await notificationStorageService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Silent error handling for notification count
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationStorageService.markAsRead(notificationId);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Silent error handling for mark as read
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationStorageService.markAllAsRead();
      setUnreadCount(0);
    } catch (error) {
      // Silent error handling for mark all as read
    }
  }, []);

  const incrementCount = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  const decrementCount = useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    updateUnreadCount();

    // Listen for unread count changes from message notification service
    const handleUnreadCountChange = () => {
      updateUnreadCount();
    };

    messageNotificationService.addUnreadCountCallback(handleUnreadCountChange);

    return () => {
      messageNotificationService.removeUnreadCountCallback(handleUnreadCountChange);
    };
  }, [updateUnreadCount]);

  return {
    unreadCount,
    isLoading,
    updateUnreadCount,
    markAsRead,
    markAllAsRead,
    incrementCount,
    decrementCount,
  };
};
