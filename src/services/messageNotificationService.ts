import { formatNotificationPayload } from '../utils/notificationUtils';
import notificationStorageService from './notificationStorage';

interface MessageNotificationData {
  chatId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  chatName: string;
  chatType: 'direct' | 'group';
  messageText: string;
}

class MessageNotificationService {
  private static instance: MessageNotificationService;
  private unreadCountCallbacks: Set<() => void> = new Set();

  static getInstance(): MessageNotificationService {
    if (!MessageNotificationService.instance) {
      MessageNotificationService.instance = new MessageNotificationService();
    }
    return MessageNotificationService.instance;
  }

  /**
   * Add callback to be notified when unread count changes
   */
  addUnreadCountCallback(callback: () => void): void {
    this.unreadCountCallbacks.add(callback);
  }

  /**
   * Remove callback for unread count changes
   */
  removeUnreadCountCallback(callback: () => void): void {
    this.unreadCountCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks that unread count has changed
   */
  private notifyUnreadCountChange(): void {
    this.unreadCountCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('🔔 MessageNotificationService: Error in unread count callback:', error);
      }
    });
  }

  /**
   * Create and store a notification for a new message
   */
  async createMessageNotification(data: MessageNotificationData): Promise<void> {
    try {
      console.log('🔔 MessageNotificationService: Creating notification for message:', data.messageId);

      // Format the notification payload
      const notificationPayload = formatNotificationPayload(
        data.senderName,
        data.messageText,
        data.chatName,
        data.chatType,
        data.chatId,
        data.messageId,
        data.senderId
      );

      // Store the notification
      await notificationStorageService.storeNotification(notificationPayload);

      // Notify callbacks that unread count has changed
      this.notifyUnreadCountChange();

      console.log('🔔 MessageNotificationService: Notification created successfully');
    } catch (error) {
      console.error('🔔 MessageNotificationService: Failed to create notification:', error);
    }
  }

  /**
   * Check if a message should trigger a notification
   */
  shouldCreateNotification(
    message: any,
    currentUserId: string,
    activeChatId?: string
  ): boolean {
    try {
      // Don't notify for messages sent by current user
      if (message.senderId === currentUserId) {
        return false;
      }

      // Don't notify if user is currently viewing this chat
      if (activeChatId === message.chatId) {
        return false;
      }

      // Don't notify for empty messages
      if (!message.text || message.text.trim().length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔔 MessageNotificationService: Error checking notification eligibility:', error);
      return false;
    }
  }

  /**
   * Process a new message and create notification if appropriate
   */
  async processNewMessage(
    message: any,
    currentUserId: string,
    activeChatId?: string
  ): Promise<void> {
    try {
      if (!this.shouldCreateNotification(message, currentUserId, activeChatId)) {
        return;
      }

      // Get chat information for the notification
      const chatInfo = await this.getChatInfo(message.chatId);
      if (!chatInfo) {
        console.log('🔔 MessageNotificationService: Could not get chat info for:', message.chatId);
        return;
      }

      // Get sender information
      const senderInfo = await this.getSenderInfo(message.senderId);
      if (!senderInfo) {
        console.log('🔔 MessageNotificationService: Could not get sender info for:', message.senderId);
        return;
      }

      // Create the notification
      await this.createMessageNotification({
        chatId: message.chatId,
        messageId: message.id,
        senderId: message.senderId,
        senderName: senderInfo.displayName || senderInfo.email || 'Unknown',
        chatName: chatInfo.name || 'Chat',
        chatType: chatInfo.type || 'direct',
        messageText: message.text,
      });
    } catch (error) {
      console.error('🔔 MessageNotificationService: Failed to process new message:', error);
    }
  }

  /**
   * Get chat information from Firestore
   */
  private async getChatInfo(chatId: string): Promise<any> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        return chatDoc.data();
      }
      return null;
    } catch (error) {
      console.error('🔔 MessageNotificationService: Failed to get chat info:', error);
      return null;
    }
  }

  /**
   * Get sender information from Firestore
   */
  private async getSenderInfo(senderId: string): Promise<any> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      
      const userRef = doc(db, 'users', senderId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('🔔 MessageNotificationService: Failed to get sender info:', error);
      return null;
    }
  }

  /**
   * Clear all notifications (useful for testing or reset)
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await notificationStorageService.clearAllNotifications();
      this.notifyUnreadCountChange();
    } catch (error) {
      console.error('🔔 MessageNotificationService: Failed to clear notifications:', error);
    }
  }
}

// Export singleton instance
export const messageNotificationService = MessageNotificationService.getInstance();
export default messageNotificationService;
