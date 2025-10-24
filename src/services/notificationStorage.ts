import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPayload } from '../utils/notificationUtils';

export interface StoredNotification extends NotificationPayload {
  id: string;
  timestamp: Date;
  isRead: boolean;
  chatId: string;
  messageId: string;
}

class NotificationStorageService {
  private readonly STORAGE_KEY = 'notifications_history';
  private readonly MAX_NOTIFICATIONS = 100; // Keep last 100 notifications

  /**
   * Store a new notification
   */
  async storeNotification(notification: NotificationPayload): Promise<void> {
    try {
      const storedNotifications = await this.getStoredNotifications();
      
      const newNotification: StoredNotification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        isRead: false,
        chatId: notification.data.chatId,
        messageId: notification.data.messageId,
      };

      // Add to beginning of array (most recent first)
      const updatedNotifications = [newNotification, ...storedNotifications];
      
      // Keep only the most recent notifications
      const trimmedNotifications = updatedNotifications.slice(0, this.MAX_NOTIFICATIONS);
      
      await AsyncStorage.setItem(
        this.STORAGE_KEY, 
        JSON.stringify(trimmedNotifications)
      );
      
      console.log('🔔 NotificationStorage: Stored notification:', newNotification.id);
    } catch (error) {
      console.error('🔔 NotificationStorage: Failed to store notification:', error);
    }
  }

  /**
   * Get all stored notifications
   */
  async getStoredNotifications(): Promise<StoredNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }
      
      const notifications = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return notifications.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    } catch (error) {
      console.error('🔔 NotificationStorage: Failed to get stored notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      
      await AsyncStorage.setItem(
        this.STORAGE_KEY, 
        JSON.stringify(updatedNotifications)
      );
      
      console.log('🔔 NotificationStorage: Marked notification as read:', notificationId);
    } catch (error) {
      console.error('🔔 NotificationStorage: Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
      
      await AsyncStorage.setItem(
        this.STORAGE_KEY, 
        JSON.stringify(updatedNotifications)
      );
      
      console.log('🔔 NotificationStorage: Marked all notifications as read');
    } catch (error) {
      console.error('🔔 NotificationStorage: Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      
      await AsyncStorage.setItem(
        this.STORAGE_KEY, 
        JSON.stringify(updatedNotifications)
      );
      
      console.log('🔔 NotificationStorage: Deleted notification:', notificationId);
    } catch (error) {
      console.error('🔔 NotificationStorage: Failed to delete notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🔔 NotificationStorage: Cleared all notifications');
    } catch (error) {
      console.error('🔔 NotificationStorage: Failed to clear all notifications:', error);
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter(n => !n.isRead).length;
    } catch (error) {
      console.error('🔔 NotificationStorage: Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Get notifications for a specific chat
   */
  async getNotificationsForChat(chatId: string): Promise<StoredNotification[]> {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter(n => n.chatId === chatId);
    } catch (error) {
      console.error('🔔 NotificationStorage: Failed to get notifications for chat:', error);
      return [];
    }
  }
}

// Export singleton instance
export const notificationStorageService = new NotificationStorageService();
export default notificationStorageService;
