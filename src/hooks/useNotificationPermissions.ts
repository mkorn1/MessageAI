import { useCallback, useEffect, useState } from 'react';
import notificationService from '../services/notificationService';

interface UseNotificationPermissionsReturn {
  hasPermissions: boolean;
  showPermissionModal: boolean;
  requestPermissions: () => Promise<void>;
  skipPermissions: () => void;
  checkPermissions: () => Promise<void>;
}

export const useNotificationPermissions = (): UseNotificationPermissionsReturn => {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Permission status change callback
  const handlePermissionChange = useCallback((hasPermissions: boolean) => {
    console.log('🔔 useNotificationPermissions: Permission status changed:', hasPermissions);
    setHasPermissions(hasPermissions);
    
    // Hide modal if permissions are granted
    if (hasPermissions) {
      setShowPermissionModal(false);
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      const enabled = await notificationService.areNotificationsEnabled();
      setHasPermissions(enabled);
      
      // If permissions are already granted, initialize foreground handling
      if (enabled && notificationService.isServiceInitialized()) {
        console.log('🔔 useNotificationPermissions: Permissions already granted, initializing foreground handling');
        // Note: initializeWithPermissions will be called automatically by requestPermissions
        // when permissions are granted, but we need to handle the case where they're already granted
        try {
          await notificationService.initializeWithPermissions();
        } catch (error) {
          console.log('🔔 useNotificationPermissions: Foreground handling already initialized or failed:', error);
        }
      }
      
      // Show modal if permissions not granted and service is initialized
      if (!enabled && notificationService.isServiceInitialized()) {
        setShowPermissionModal(true);
      }
    } catch (error) {
      console.error('🔔 Error checking notification permissions:', error);
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const { status } = await notificationService.requestPermissions();
      
      if (status === 'granted') {
        setHasPermissions(true);
        setShowPermissionModal(false);
        console.log('🔔 Notification permissions granted');
      } else {
        console.log('🔔 Notification permissions denied');
      }
    } catch (error) {
      console.error('🔔 Error requesting notification permissions:', error);
    }
  }, []);

  const skipPermissions = useCallback(() => {
    setShowPermissionModal(false);
    console.log('🔔 User skipped notification permissions');
  }, []);

  // Set up permission status change listener
  useEffect(() => {
    // Add callback to notification service
    notificationService.addPermissionCallback(handlePermissionChange);
    
    // Initial permission check
    checkPermissions();
    
    // Cleanup callback on unmount
    return () => {
      notificationService.removePermissionCallback(handlePermissionChange);
    };
  }, [handlePermissionChange, checkPermissions]);

  return {
    hasPermissions,
    showPermissionModal,
    requestPermissions,
    skipPermissions,
    checkPermissions,
  };
};

export default useNotificationPermissions;
