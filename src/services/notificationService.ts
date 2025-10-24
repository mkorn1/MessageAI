import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatNotificationPayload, validateNotificationPayload } from '../utils/notificationUtils';
import activeChatService from './activeChatService';
import appStateService from './appStateService';
import deepLinkService from './deepLinkService';
import notificationErrorService from './notificationErrorService';
import notificationPreferencesService from './notificationPreferencesService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  chatId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  chatName: string;
  chatType: 'direct' | 'group';
  messageText?: string; // Add message text for preference checking
}

class NotificationService {
  private fcmToken: string | null = null;
  private isInitialized = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private permissionCallbacks: Set<(hasPermissions: boolean) => void> = new Set();
  private inAppNotificationCallbacks: Set<(notification: any) => void> = new Set();

  /**
   * Add in-app notification callback
   */
  addInAppNotificationCallback(callback: (notification: any) => void): void {
    this.inAppNotificationCallbacks.add(callback);
  }

  /**
   * Remove in-app notification callback
   */
  removeInAppNotificationCallback(callback: (notification: any) => void): void {
    this.inAppNotificationCallbacks.delete(callback);
  }

  /**
   * Notify all in-app notification callbacks
   */
  private notifyInAppNotificationCallbacks(notification: any): void {
    this.inAppNotificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('🔔 NotificationService: Error in in-app notification callback:', error);
      }
    });
  }

  /**
   * Add permission status change callback
   */
  addPermissionCallback(callback: (hasPermissions: boolean) => void): void {
    this.permissionCallbacks.add(callback);
  }

  /**
   * Remove permission status change callback
   */
  removePermissionCallback(callback: (hasPermissions: boolean) => void): void {
    this.permissionCallbacks.delete(callback);
  }

  /**
   * Notify all permission callbacks of status change
   */
  private notifyPermissionCallbacks(hasPermissions: boolean): void {
    this.permissionCallbacks.forEach(callback => {
      try {
        callback(hasPermissions);
      } catch (error) {
        console.error('🔔 NotificationService: Error in permission callback:', error);
      }
    });
  }

  /**
   * Set up error handling and retry callbacks
   */
  private setupErrorHandling(): void {
    console.log('🔔 NotificationService: Setting up error handling');
    
    // Add retry callback for token registration
    notificationErrorService.addRetryCallback(async (retryItem) => {
      try {
        const { payload } = retryItem;
        
        if (payload.type === 'token_registration') {
          const success = await this.registerTokenWithUser(payload.userId);
          if (success) {
            // Disable logging to prevent log flood
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.error('🔔 NotificationService: Retry callback error:', error);
        return false;
      }
    });
  }

  /**
   * Initialize the notification service
   * This should be called when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔔 NotificationService: Already initialized');
      return;
    }

    try {
      console.log('🔔 NotificationService: Initializing...');
      
      // Set up error handling retry callbacks
      this.setupErrorHandling();
      
      // Set up notification listeners (for cold start handling)
      this.setupNotificationListeners();

      // Initialize deep linking service
      await deepLinkService.initialize();

      this.isInitialized = true;
      console.log('🔔 NotificationService: Basic initialization complete');
    } catch (error) {
      console.error('🔔 NotificationService: Initialization failed:', error);
    }
  }

  /**
   * Initialize notification service with permissions
   * This should be called after permissions are granted via the modal
   */
  async initializeWithPermissions(): Promise<void> {
    try {
      console.log('🔔 NotificationService: Setting up with permissions...');
      
      // Configure notification behavior for foreground
      await Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          console.log('🔔 NotificationService: Received foreground notification:', notification);
          
          // Check if we should suppress this notification
          const shouldSuppress = await this.shouldSuppressNotification(notification);
          
          if (shouldSuppress) {
            console.log('🔔 NotificationService: Suppressing notification (user in active chat)');
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
              shouldShowBanner: false,
              shouldShowList: false,
            };
          }
          
          // Show notification with custom handling
          this.showInAppNotification(notification);
          
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });

      // Get FCM token
      await this.getFCMToken();

      // Start token refresh interval (every 24 hours)
      this.startTokenRefreshInterval();

      console.log('🔔 NotificationService: Permission-based setup complete');
    } catch (error) {
      console.error('🔔 NotificationService: Permission setup failed:', error);
    }
  }

  /**
   * Get FCM token for push notifications
   */
  async getFCMToken(): Promise<string | null> {
    try {
      console.log('🔔 NotificationService: Getting FCM token...');
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'messageai-d518c', // Your Expo project ID
      });

      this.fcmToken = token.data;
      console.log('🔔 NotificationService: FCM token obtained:', this.fcmToken.substring(0, 20) + '...');
      
      return this.fcmToken;
    } catch (error) {
      console.error('🔔 NotificationService: Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with Firestore user document
   */
  async registerTokenWithUser(userId: string): Promise<boolean> {
    try {
      if (!this.fcmToken) {
        console.warn('🔔 NotificationService: No FCM token available');
        
        // Log error and add to retry queue
        const error = notificationErrorService.logError(
          'TOKEN_INVALID',
          'No FCM token available for registration',
          { userId }
        );
        
        notificationErrorService.addToRetryQueue(
          { type: 'token_registration', userId },
          error
        );
        
        return false;
      }

      console.log('🔔 NotificationService: Registering token for user:', userId);

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: this.fcmToken,
        lastTokenUpdate: new Date(),
        notificationPreferences: {
          enabled: true,
          foregroundOnly: true, // MVP: foreground only
        }
      });

      console.log('🔔 NotificationService: Token registered successfully');
      return true;
      
    } catch (error) {
      console.error('🔔 NotificationService: Failed to register token:', error);
      
      // Log error and add to retry queue
      const notificationError = notificationErrorService.logError(
        'NETWORK_ERROR',
        'Failed to register FCM token with Firestore',
        { userId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      notificationErrorService.addToRetryQueue(
        { type: 'token_registration', userId },
        notificationError
      );
      
      return false;
    }
  }

  /**
   * Remove FCM token from user document (on logout)
   */
  async removeTokenFromUser(userId: string): Promise<boolean> {
    try {
      console.log('🔔 NotificationService: Removing token for user:', userId);

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: null,
        lastTokenUpdate: new Date(),
      });

      console.log('🔔 NotificationService: Token removed successfully');
      return true;
    } catch (error) {
      console.error('🔔 NotificationService: Failed to remove token:', error);
      return false;
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    console.log('🔔 NotificationService: Setting up notification listeners');

    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 NotificationService: Notification received:', notification);
      // For MVP: notifications are handled by the system
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('🔔 NotificationService: Notification tapped:', response);
      
      const data = response.notification.request.content.data as unknown as NotificationData;
      
      if (data?.chatId) {
        // Navigate to specific chat
        this.handleNotificationNavigation(data).catch(error => {
          console.error('🔔 NotificationService: Error in notification navigation:', error);
        });
      }
    });

    // Handle initial notification (when app is opened from notification)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        console.log('🔔 NotificationService: App opened from notification:', response);
        
        const data = response.notification.request.content.data as unknown as NotificationData;
        
        if (data?.chatId) {
          // Small delay to ensure app is fully loaded
          setTimeout(() => {
            this.handleNotificationNavigation(data).catch(error => {
              console.error('🔔 NotificationService: Error in initial notification navigation:', error);
            });
          }, 1000);
        }
      }
    });
  }

  /**
   * Clear notification badge count
   */
  async clearBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('🔔 NotificationService: Badge count cleared');
    } catch (error) {
      console.error('🔔 NotificationService: Error clearing badge count:', error);
    }
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('🔔 NotificationService: Badge count set to:', count);
    } catch (error) {
      console.error('🔔 NotificationService: Error setting badge count:', error);
    }
  }

  /**
   * Handle deep linking from notification
   */
  handleDeepLink(url: string): void {
    try {
      console.log('🔔 NotificationService: Handling deep link:', url);
      
      // Use the deep linking service to process the URL
      deepLinkService.processDeepLink(url);
      
    } catch (error) {
      console.error('🔔 NotificationService: Error handling deep link:', error);
      // Fallback to home
      router.push('/' as any);
    }
  }

  /**
   * Handle navigation when notification is tapped
   */
  private async handleNotificationNavigation(data: NotificationData): Promise<void> {
    try {
      console.log('🔔 NotificationService: Navigating to chat:', data.chatId);
      
      if (!data.chatId) {
        console.warn('🔔 NotificationService: No chatId provided for navigation');
        return;
      }

      // Generate deep link for notification navigation
      const deepLinkUrl = deepLinkService.generateNotificationDeepLink({
        chatId: data.chatId,
        messageId: data.messageId,
        senderId: data.senderId,
        chatName: data.chatName,
        chatType: data.chatType,
        messageText: data.messageText,
      });

      // Process the deep link for navigation
      deepLinkService.processDeepLink(deepLinkUrl);
      
      // Clear badge count when navigating to chat
      await this.clearBadgeCount();
      
      console.log('🔔 NotificationService: Navigation initiated via deep link to chat:', data.chatId);
      
    } catch (error) {
      console.error('🔔 NotificationService: Error navigating to chat:', error);
      
      // Fallback: navigate to home screen
      try {
        router.push('/' as any);
        console.log('🔔 NotificationService: Fallback navigation to home');
      } catch (fallbackError) {
        console.error('🔔 NotificationService: Fallback navigation failed:', fallbackError);
      }
    }
  }

  /**
   * Show custom in-app notification (for foreground notifications)
   */
  private showInAppNotification(notification: Notifications.Notification): void {
    try {
      const data = notification.request.content.data as unknown as NotificationData;
      
      if (!data) {
        console.log('🔔 NotificationService: No notification data for in-app display');
        return;
      }

      // Format notification payload using utilities
      const payload = formatNotificationPayload(
        data.senderName,
        data.messageText || '',
        data.chatName,
        data.chatType,
        data.chatId,
        data.messageId,
        data.senderId
      );

      // Validate payload
      const validation = validateNotificationPayload(payload);
      if (!validation.isValid) {
        console.error('🔔 NotificationService: Invalid notification payload:', validation.errors);
        return;
      }

      // Notify callbacks to show in-app notification
      this.notifyInAppNotificationCallbacks(payload);
      
      console.log('🔔 NotificationService: In-app notification triggered:', {
        title: payload.title,
        body: payload.body,
        chatId: data.chatId,
        senderName: data.senderName,
      });
      
    } catch (error) {
      console.error('🔔 NotificationService: Error showing in-app notification:', error);
    }
  }

  /**
   * Check if notification should be shown based on app state and preferences
   */
  private shouldShowNotificationBasedOnAppState(): boolean {
    try {
      const appStateInfo = appStateService.getAppStateInfo();
      const preferences = notificationPreferencesService.getPreferences();
      
      // If foregroundOnly is enabled and app is not active, don't show notification
      if (preferences.foregroundOnly && !appStateInfo.isActive) {
        console.log('🔔 NotificationService: Foreground only enabled and app not active, suppressing notification');
        return false;
      }
      
      // If app is active, show notification (will be handled by foreground handler)
      if (appStateInfo.isActive) {
        console.log('🔔 NotificationService: App is active, showing notification');
        return true;
      }
      
      // If app is in background, show notification
      if (appStateInfo.isBackground) {
        console.log('🔔 NotificationService: App is in background, showing notification');
        return true;
      }
      
      // If app is inactive, show notification
      if (appStateInfo.isInactive) {
        console.log('🔔 NotificationService: App is inactive, showing notification');
        return true;
      }
      
      return true;
      
    } catch (error) {
      console.error('🔔 NotificationService: Error checking app state for notification:', error);
      return true; // Default to showing notification on error
    }
  }

  /**
   * Enhanced smart suppression logic for message notifications
   */
  private async checkSmartSuppression(messageData: {
    chatId: string;
    messageId: string;
    senderId: string;
    messageText: string;
    timestamp: Date;
    chatType?: 'direct' | 'group';
  }): Promise<{ shouldSuppress: boolean; reason: string }> {
    try {
      console.log('🔔 NotificationService: Running smart suppression checks for chat:', messageData.chatId);

      // 1. Check if user is in the same chat (primary suppression)
      const isInSameChat = activeChatService.isInSpecificChat(messageData.chatId);
      if (isInSameChat) {
        return {
          shouldSuppress: true,
          reason: 'User is actively viewing this chat'
        };
      }

      // 2. Check if active chat service is properly initialized
      if (!activeChatService) {
        console.warn('🔔 NotificationService: ActiveChatService not initialized, allowing notification');
        return { shouldSuppress: false, reason: 'ActiveChatService not initialized' };
      }

      // 3. Check notification preferences with proper chat type
      const chatType = messageData.chatType || 'direct'; // Default to direct if not provided
      const shouldNotify = notificationPreferencesService.shouldNotifyForMessage(
        messageData.messageText,
        chatType
      );

      if (!shouldNotify) {
        return {
          shouldSuppress: true,
          reason: `Notification preferences disabled for ${chatType} messages`
        };
      }

      // 4. Check app state and foreground-only preference
      const shouldShowBasedOnAppState = this.shouldShowNotificationBasedOnAppState();
      if (!shouldShowBasedOnAppState) {
        return {
          shouldSuppress: true,
          reason: 'App state or foreground-only preference prevents notification'
        };
      }

      // 5. Check if user is currently typing in this chat (future enhancement)
      // This could be implemented by checking if user has recent typing activity
      // For now, we'll skip this check

      console.log('🔔 NotificationService: All suppression checks passed, notification allowed');
      return {
        shouldSuppress: false,
        reason: 'All suppression checks passed'
      };

    } catch (error) {
      console.error('🔔 NotificationService: Error in smart suppression check:', error);
      // On error, allow notification to be safe
      return {
        shouldSuppress: false,
        reason: 'Error in suppression check, allowing notification'
      };
    }
  }

  /**
   * Check if notification should be suppressed (e.g., user is in active chat)
   * This method is used for foreground notifications
   */
  private async shouldSuppressNotification(notification: Notifications.Notification): Promise<boolean> {
    try {
      // Get notification data
      const data = notification.request.content.data as unknown as NotificationData;
      
      if (!data || !data.chatId) {
        console.log('🔔 NotificationService: No chat data, not suppressing');
        return false;
      }

      // Use the enhanced smart suppression logic
      const suppressionResult = await this.checkSmartSuppression({
        chatId: data.chatId,
        messageId: data.messageId || '',
        senderId: data.senderId || '',
        messageText: data.messageText || '',
        timestamp: new Date(),
        chatType: data.chatType
      });

      console.log('🔔 NotificationService: Foreground notification suppression result:', suppressionResult.reason);
      return suppressionResult.shouldSuppress;
      
    } catch (error) {
      console.error('🔔 NotificationService: Error checking suppression:', error);
      return false; // Default to showing notification on error
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('🔔 NotificationService: Failed to check permissions:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<{ status: string }> {
    try {
      console.log('🔔 NotificationService: Requesting notification permissions');
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('🔔 NotificationService: Permission status:', status);
      
      // Notify callbacks of permission status change
      this.notifyPermissionCallbacks(status === 'granted');
      
      // If permissions granted, initialize foreground handling
      if (status === 'granted') {
        console.log('🔔 NotificationService: Permissions granted, initializing foreground handling');
        await this.initializeWithPermissions();
      }
      
      return { status };
    } catch (error) {
      console.error('🔔 NotificationService: Failed to request permissions:', error);
      this.notifyPermissionCallbacks(false);
      return { status: 'denied' };
    }
  }

  /**
   * Refresh FCM token (call periodically)
   */
  async refreshToken(): Promise<string | null> {
    console.log('🔔 NotificationService: Refreshing FCM token');
    return await this.getFCMToken();
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Start token refresh interval
   */
  private startTokenRefreshInterval(): void {
    console.log('🔔 NotificationService: Starting token refresh interval');
    
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh token every 24 hours
    this.refreshInterval = setInterval(async () => {
      console.log('🔔 NotificationService: Refreshing token (scheduled)');
      await this.refreshToken();
    }, 24 * 60 * 60 * 1000) as unknown as NodeJS.Timeout; // 24 hours
  }

  /**
   * Stop token refresh interval
   */
  private stopTokenRefreshInterval(): void {
    if (this.refreshInterval) {
      console.log('🔔 NotificationService: Stopping token refresh interval');
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Retry token registration with exponential backoff
   */
  private async retryTokenRegistration(userId: string): Promise<boolean> {
    if (this.retryCount >= this.maxRetries) {
      console.error('🔔 NotificationService: Max retries reached for token registration');
      this.retryCount = 0;
      return false;
    }

    this.retryCount++;
    const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
    
    console.log(`🔔 NotificationService: Retrying token registration (attempt ${this.retryCount}/${this.maxRetries}) in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const success = await this.registerTokenWithUser(userId);
      if (success) {
        this.retryCount = 0; // Reset on success
      }
      return success;
    } catch (error) {
      console.error(`🔔 NotificationService: Retry ${this.retryCount} failed:`, error);
      return await this.retryTokenRegistration(userId);
    }
  }

  /**
   * Handle token registration errors
   */
  async registerTokenWithUserWithRetry(userId: string): Promise<boolean> {
    try {
      const success = await this.registerTokenWithUser(userId);
      if (!success) {
        console.warn('🔔 NotificationService: Token registration failed, attempting retry');
        return await this.retryTokenRegistration(userId);
      }
      return success;
    } catch (error) {
      console.error('🔔 NotificationService: Token registration error:', error);
      return await this.retryTokenRegistration(userId);
    }
  }

  /**
   * Fetch notification data including sender and chat information
   */
  private async fetchNotificationData(messageData: {
    chatId: string;
    messageId: string;
    senderId: string;
    messageText: string;
    timestamp: Date;
    chatType?: 'direct' | 'group';
  }): Promise<{
    title: string;
    body: string;
    senderName: string;
    chatName: string;
    chatType: 'direct' | 'group';
  }> {
    try {
      console.log('🔔 NotificationService: Fetching notification data for chat:', messageData.chatId);

      // Fetch chat and sender data in parallel
      const [chatResult, senderResult] = await Promise.allSettled([
        this.fetchChatData(messageData.chatId),
        this.fetchSenderData(messageData.senderId)
      ]);

      // Extract chat information
      const chatData = chatResult.status === 'fulfilled' ? chatResult.value : null;
      const senderData = senderResult.status === 'fulfilled' ? senderResult.value : null;

      // Determine chat type
      const chatType = messageData.chatType || chatData?.type || 'direct';
      const chatName = chatData?.name || this.getDefaultChatName(chatType);
      const senderName = senderData?.displayName || senderData?.email || 'Unknown User';

      // Format notification title and body based on chat type
      const title = this.formatNotificationTitle(senderName, chatName, chatType);
      const body = this.formatNotificationBody(messageData.messageText);

      console.log('🔔 NotificationService: Notification data fetched:', {
        title,
        body,
        senderName,
        chatName,
        chatType
      });

      return {
        title,
        body,
        senderName,
        chatName,
        chatType
      };

    } catch (error) {
      console.error('🔔 NotificationService: Error fetching notification data:', error);
      
      // Return default data on error
      return {
        title: 'New Message',
        body: messageData.messageText,
        senderName: 'Unknown User',
        chatName: 'Chat',
        chatType: 'direct'
      };
    }
  }

  /**
   * Fetch chat data from Firestore
   */
  private async fetchChatData(chatId: string): Promise<any> {
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        return chatDoc.data();
      }
      return null;
    } catch (error) {
      console.error('🔔 NotificationService: Error fetching chat data:', error);
      return null;
    }
  }

  /**
   * Fetch sender data from Firestore
   */
  private async fetchSenderData(senderId: string): Promise<any> {
    try {
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      if (senderDoc.exists()) {
        return senderDoc.data();
      }
      return null;
    } catch (error) {
      console.error('🔔 NotificationService: Error fetching sender data:', error);
      return null;
    }
  }

  /**
   * Get default chat name based on chat type
   */
  private getDefaultChatName(chatType: 'direct' | 'group'): string {
    return chatType === 'group' ? 'Group Chat' : 'Direct Message';
  }

  /**
   * Format notification title based on chat type
   */
  private formatNotificationTitle(senderName: string, chatName: string, chatType: 'direct' | 'group'): string {
    if (chatType === 'group') {
      return `${senderName} in ${chatName}`;
    } else {
      return senderName;
    }
  }

  /**
   * Format notification body (truncate if too long)
   */
  private formatNotificationBody(messageText: string): string {
    if (messageText.length > 50) {
      return messageText.substring(0, 50) + '...';
    }
    return messageText;
  }

  /**
   * Check and send notification for a message
   * This method is called by MessagingService to trigger notification checks
   */
  async checkAndSendNotification(messageData: {
    chatId: string;
    messageId: string;
    senderId: string;
    messageText: string;
    timestamp: Date;
    chatType?: 'direct' | 'group'; // Optional chat type for better suppression logic
  }): Promise<void> {
    try {
      console.log('🔔 NotificationService: Checking notification for message:', messageData.messageId);
      
      // Enhanced active chat suppression check
      const suppressionResult = await this.checkSmartSuppression(messageData);
      if (suppressionResult.shouldSuppress) {
        console.log('🔔 NotificationService: Notification suppressed:', suppressionResult.reason);
        return;
      }
      
      // Fetch sender and chat information for proper notification formatting
      const notificationData = await this.fetchNotificationData(messageData);
      
      // Show in-app notification with proper data
      this.showInAppNotification({
        request: {
          content: {
            title: notificationData.title,
            body: notificationData.body,
            data: {
              chatId: messageData.chatId,
              messageId: messageData.messageId,
              senderId: messageData.senderId,
              senderName: notificationData.senderName,
              chatName: notificationData.chatName,
              chatType: notificationData.chatType,
              messageText: messageData.messageText
            }
          }
        },
        date: messageData.timestamp
      } as unknown as Notifications.Notification);
      
    } catch (error) {
      console.error('🔔 NotificationService: Error checking notification:', error);
    }
  }

  /**
   * Cleanup method for service shutdown
   */
  cleanup(): void {
    console.log('🔔 NotificationService: Cleaning up');
    this.stopTokenRefreshInterval();
    
    // Clear permission callbacks
    this.permissionCallbacks.clear();
    
    // Clear in-app notification callbacks
    this.inAppNotificationCallbacks.clear();
    
    // Cleanup error service
    notificationErrorService.cleanup();
    
    this.fcmToken = null;
    this.isInitialized = false;
    this.retryCount = 0;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
