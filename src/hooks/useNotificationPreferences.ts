import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import notificationPreferencesService from '../services/notificationPreferencesService';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NotificationPreferences,
    NotificationPreferenceUpdate
} from '../types/notificationPreferences';

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  isLoading: boolean;
  updatePreferences: (updates: NotificationPreferenceUpdate) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  isInQuietHours: () => boolean;
  shouldNotifyForMessage: (messageText: string, chatType: 'direct' | 'group') => boolean;
}

export const useNotificationPreferences = (): UseNotificationPreferencesReturn => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences when user changes
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const loadedPreferences = await notificationPreferencesService.loadPreferences(user.uid);
          setPreferences(loadedPreferences);
        } catch (error) {
          console.error('🔔 useNotificationPreferences: Error loading preferences:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Reset to defaults when user logs out
        setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setIsLoading(false);
      }
    };

    loadUserPreferences();
  }, [user]);

  // Set up preference change listener
  useEffect(() => {
    const handlePreferenceChange = (newPreferences: NotificationPreferences) => {
      setPreferences(newPreferences);
    };

    notificationPreferencesService.addListener(handlePreferenceChange);

    return () => {
      notificationPreferencesService.removeListener(handlePreferenceChange);
    };
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (updates: NotificationPreferenceUpdate): Promise<boolean> => {
    if (!user) {
      console.warn('🔔 useNotificationPreferences: No user logged in');
      return false;
    }

    try {
      const success = await notificationPreferencesService.updatePreferences(user.uid, updates);
      return success;
    } catch (error) {
      console.error('🔔 useNotificationPreferences: Error updating preferences:', error);
      return false;
    }
  }, [user]);

  // Reset to defaults
  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.warn('🔔 useNotificationPreferences: No user logged in');
      return false;
    }

    try {
      const success = await notificationPreferencesService.resetToDefaults(user.uid);
      return success;
    } catch (error) {
      console.error('🔔 useNotificationPreferences: Error resetting preferences:', error);
      return false;
    }
  }, [user]);

  // Check if in quiet hours
  const isInQuietHours = useCallback((): boolean => {
    return notificationPreferencesService.isInQuietHours();
  }, []);

  // Check if message should trigger notification
  const shouldNotifyForMessage = useCallback((messageText: string, chatType: 'direct' | 'group'): boolean => {
    return notificationPreferencesService.shouldNotifyForMessage(messageText, chatType);
  }, []);

  return {
    preferences,
    isLoading,
    updatePreferences,
    resetToDefaults,
    isInQuietHours,
    shouldNotifyForMessage,
  };
};

export default useNotificationPreferences;
