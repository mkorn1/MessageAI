import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';

export interface DeepLinkData {
  type: 'chat' | 'notification' | 'home' | 'unknown';
  chatId?: string;
  messageId?: string;
  senderId?: string;
  chatName?: string;
  chatType?: 'direct' | 'group';
  messageText?: string;
  originalUrl: string;
}

class DeepLinkService {
  private isInitialized = false;
  private initialUrl: string | null = null;
  private listeners: Set<(data: DeepLinkData) => void> = new Set();
  private appStateSubscription: any = null;

  /**
   * Initialize deep linking service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔗 DeepLinkService: Already initialized');
      return;
    }

    try {
      console.log('🔗 DeepLinkService: Initializing deep linking...');

      // Get initial URL if app was opened via deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('🔗 DeepLinkService: Initial URL detected:', initialUrl);
        this.initialUrl = initialUrl;
        this.processInitialUrl();
      }

      // Listen for deep links while app is running
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
      
      // Listen for incoming deep links
      const linkingSubscription = Linking.addEventListener('url', this.handleIncomingUrl);

      this.isInitialized = true;
      console.log('🔗 DeepLinkService: Deep linking initialized successfully');

      // Cleanup function
      return () => {
        if (this.appStateSubscription) {
          this.appStateSubscription.remove();
        }
        linkingSubscription?.remove();
      };

    } catch (error) {
      console.error('🔗 DeepLinkService: Failed to initialize deep linking:', error);
    }
  }

  /**
   * Handle app state changes to process initial URL
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active' && this.initialUrl) {
      console.log('🔗 DeepLinkService: App became active, processing initial URL');
      this.processInitialUrl();
      this.initialUrl = null; // Clear after processing
    }
  };

  /**
   * Process initial URL when app becomes active
   */
  private processInitialUrl(): void {
    if (this.initialUrl) {
      // Add a small delay to ensure app is fully loaded
      setTimeout(() => {
        this.handleIncomingUrl({ url: this.initialUrl! });
      }, 1000);
    }
  }

  /**
   * Handle incoming deep link URLs
   */
  private handleIncomingUrl = (event: { url: string }): void => {
    console.log('🔗 DeepLinkService: Incoming deep link:', event.url);
    this.processDeepLink(event.url);
  };

  /**
   * Process and parse deep link URL
   */
  processDeepLink(url: string): DeepLinkData {
    try {
      console.log('🔗 DeepLinkService: Processing deep link:', url);

      // Parse the URL
      const parsedUrl = Linking.parse(url);
      console.log('🔗 DeepLinkService: Parsed URL:', parsedUrl);

      // Extract path segments
      const pathSegments = parsedUrl.path?.split('/').filter(Boolean) || [];
      console.log('🔗 DeepLinkService: Path segments:', pathSegments);

      // Determine link type and extract data
      let deepLinkData: DeepLinkData = {
        type: 'unknown',
        originalUrl: url,
      };

      // Handle different URL patterns
      if (pathSegments.length >= 2 && pathSegments[0] === 'chat') {
        // Format: /chat/{chatId} or /chat/{chatId}?messageId=123
        deepLinkData = {
          type: 'chat',
          chatId: pathSegments[1],
          messageId: parsedUrl.queryParams?.messageId as string,
          senderId: parsedUrl.queryParams?.senderId as string,
          chatName: parsedUrl.queryParams?.chatName as string,
          chatType: parsedUrl.queryParams?.chatType as 'direct' | 'group',
          messageText: parsedUrl.queryParams?.messageText as string,
          originalUrl: url,
        };
      } else if (pathSegments.length >= 1 && pathSegments[0] === 'notification') {
        // Format: /notification?chatId=123&messageId=456
        deepLinkData = {
          type: 'notification',
          chatId: parsedUrl.queryParams?.chatId as string,
          messageId: parsedUrl.queryParams?.messageId as string,
          senderId: parsedUrl.queryParams?.senderId as string,
          chatName: parsedUrl.queryParams?.chatName as string,
          chatType: parsedUrl.queryParams?.chatType as 'direct' | 'group',
          messageText: parsedUrl.queryParams?.messageText as string,
          originalUrl: url,
        };
      } else if (pathSegments.length === 0 || pathSegments[0] === 'home') {
        // Format: / or /home
        deepLinkData = {
          type: 'home',
          originalUrl: url,
        };
      }

      console.log('🔗 DeepLinkService: Processed deep link data:', deepLinkData);

      // Notify listeners
      this.notifyListeners(deepLinkData);

      // Navigate based on link type
      this.navigateFromDeepLink(deepLinkData);

      return deepLinkData;

    } catch (error) {
      console.error('🔗 DeepLinkService: Error processing deep link:', error);
      
      const errorData: DeepLinkData = {
        type: 'unknown',
        originalUrl: url,
      };
      
      this.notifyListeners(errorData);
      return errorData;
    }
  }

  /**
   * Navigate based on deep link data
   */
  private navigateFromDeepLink(data: DeepLinkData): void {
    try {
      console.log('🔗 DeepLinkService: Navigating from deep link:', data.type);

      switch (data.type) {
        case 'chat':
        case 'notification':
          if (data.chatId) {
            console.log('🔗 DeepLinkService: Navigating to chat:', data.chatId);
            router.push(`/chat/${data.chatId}` as any);
          } else {
            console.warn('🔗 DeepLinkService: No chatId provided, navigating to home');
            router.push('/' as any);
          }
          break;

        case 'home':
          console.log('🔗 DeepLinkService: Navigating to home');
          router.push('/' as any);
          break;

        default:
          console.warn('🔗 DeepLinkService: Unknown deep link type, navigating to home');
          router.push('/' as any);
          break;
      }

    } catch (error) {
      console.error('🔗 DeepLinkService: Error navigating from deep link:', error);
      // Fallback to home
      router.push('/' as any);
    }
  }

  /**
   * Generate deep link URL for a chat
   */
  generateChatDeepLink(chatId: string, options?: {
    messageId?: string;
    senderId?: string;
    chatName?: string;
    chatType?: 'direct' | 'group';
    messageText?: string;
  }): string {
    try {
      const scheme = 'messageaiappfresh'; // From app.json
      let url = `${scheme}://chat/${chatId}`;

      // Add query parameters if provided
      if (options) {
        const params = new URLSearchParams();
        
        if (options.messageId) params.append('messageId', options.messageId);
        if (options.senderId) params.append('senderId', options.senderId);
        if (options.chatName) params.append('chatName', options.chatName);
        if (options.chatType) params.append('chatType', options.chatType);
        if (options.messageText) params.append('messageText', options.messageText);

        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      console.log('🔗 DeepLinkService: Generated deep link:', url);
      return url;

    } catch (error) {
      console.error('🔗 DeepLinkService: Error generating deep link:', error);
      return 'messageaiappfresh://home';
    }
  }

  /**
   * Generate deep link URL for notifications
   */
  generateNotificationDeepLink(data: {
    chatId: string;
    messageId?: string;
    senderId?: string;
    chatName?: string;
    chatType?: 'direct' | 'group';
    messageText?: string;
  }): string {
    try {
      const scheme = 'messageaiappfresh';
      const params = new URLSearchParams();
      
      params.append('chatId', data.chatId);
      if (data.messageId) params.append('messageId', data.messageId);
      if (data.senderId) params.append('senderId', data.senderId);
      if (data.chatName) params.append('chatName', data.chatName);
      if (data.chatType) params.append('chatType', data.chatType);
      if (data.messageText) params.append('messageText', data.messageText);

      const url = `${scheme}://notification?${params.toString()}`;
      console.log('🔗 DeepLinkService: Generated notification deep link:', url);
      return url;

    } catch (error) {
      console.error('🔗 DeepLinkService: Error generating notification deep link:', error);
      return 'messageaiappfresh://home';
    }
  }

  /**
   * Add listener for deep link events
   */
  addListener(listener: (data: DeepLinkData) => void): () => void {
    this.listeners.add(listener);
    return () => this.removeListener(listener);
  }

  /**
   * Remove listener for deep link events
   */
  removeListener(listener: (data: DeepLinkData) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of deep link events
   */
  private notifyListeners(data: DeepLinkData): void {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('🔗 DeepLinkService: Error notifying listener:', error);
      }
    });
  }

  /**
   * Check if deep linking is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the initial URL that opened the app
   */
  getInitialUrl(): string | null {
    return this.initialUrl;
  }

  /**
   * Cleanup deep linking service
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
    console.log('🔗 DeepLinkService: Cleaned up');
  }
}

export const deepLinkService = new DeepLinkService();
export default deepLinkService;
