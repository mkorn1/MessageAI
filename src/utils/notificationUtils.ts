import { NotificationData } from '../services/notificationService';

export interface NotificationPayload {
  title: string;
  body: string;
  data: NotificationData;
  sound?: string;
  badge?: number;
  priority?: 'high' | 'normal';
}

export interface FormattedNotification {
  title: string;
  body: string;
  subtitle?: string;
  category?: string;
  threadId?: string;
}

export interface NotificationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Format notification title based on chat type and sender
 */
export const formatNotificationTitle = (
  senderName: string,
  chatName: string,
  chatType: 'direct' | 'group'
): string => {
  try {
    if (chatType === 'group') {
      return `${senderName} in ${chatName}`;
    } else {
      return senderName;
    }
  } catch (error) {
    console.error('🔔 NotificationUtils: Error formatting title:', error);
    return 'New message';
  }
};

/**
 * Format notification body with message preview
 */
export const formatNotificationBody = (
  messageText: string,
  maxLength: number = 100
): string => {
  try {
    if (!messageText || messageText.trim().length === 0) {
      return 'New message';
    }

    // Remove extra whitespace and newlines
    const cleanText = messageText.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long
    if (cleanText.length <= maxLength) {
      return cleanText;
    }
    
    // Find last complete word before truncation
    const truncated = cleanText.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.7) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  } catch (error) {
    console.error('🔔 NotificationUtils: Error formatting body:', error);
    return 'New message';
  }
};

/**
 * Format notification subtitle for additional context
 */
export const formatNotificationSubtitle = (
  chatName: string,
  chatType: 'direct' | 'group',
  participantCount?: number
): string => {
  try {
    if (chatType === 'group') {
      if (participantCount && participantCount > 2) {
        return `${chatName} • ${participantCount} members`;
      }
      return chatName;
    }
    
    return 'Direct message';
  } catch (error) {
    console.error('🔔 NotificationUtils: Error formatting subtitle:', error);
    return '';
  }
};

/**
 * Generate thread ID for notification grouping
 */
export const generateThreadId = (chatId: string): string => {
  try {
    return `chat_${chatId}`;
  } catch (error) {
    console.error('🔔 NotificationUtils: Error generating thread ID:', error);
    return `chat_${Date.now()}`;
  }
};

/**
 * Generate notification category for iOS
 */
export const generateNotificationCategory = (chatType: 'direct' | 'group'): string => {
  try {
    return chatType === 'group' ? 'GROUP_MESSAGE' : 'DIRECT_MESSAGE';
  } catch (error) {
    console.error('🔔 NotificationUtils: Error generating category:', error);
    return 'MESSAGE';
  }
};

/**
 * Format complete notification payload
 */
export const formatNotificationPayload = (
  senderName: string,
  messageText: string,
  chatName: string,
  chatType: 'direct' | 'group',
  chatId: string,
  messageId: string,
  senderId: string,
  participantCount?: number
): NotificationPayload => {
  try {
    const title = formatNotificationTitle(senderName, chatName, chatType);
    const body = formatNotificationBody(messageText);
    const subtitle = formatNotificationSubtitle(chatName, chatType, participantCount);
    
    const data: NotificationData = {
      chatId,
      messageId,
      senderId,
      senderName,
      chatName,
      chatType,
      messageText,
    };

    return {
      title,
      body,
      data,
      sound: 'default',
      badge: 1,
      priority: 'high',
    };
  } catch (error) {
    console.error('🔔 NotificationUtils: Error formatting notification payload:', error);
    
    // Fallback payload
    return {
      title: 'New message',
      body: 'You have a new message',
      data: {
        chatId,
        messageId,
        senderId,
        senderName: senderName || 'Unknown',
        chatName: chatName || 'Chat',
        chatType,
        messageText: messageText || '',
      },
      sound: 'default',
      badge: 1,
      priority: 'high',
    };
  }
};

/**
 * Format notification for iOS APNS
 */
export const formatAPNSPayload = (
  payload: NotificationPayload,
  threadId?: string,
  category?: string
): any => {
  try {
    return {
      aps: {
        alert: {
          title: payload.title,
          body: payload.body,
          subtitle: payload.data.chatType === 'group' ? payload.data.chatName : undefined,
        },
        sound: payload.sound || 'default',
        badge: payload.badge || 1,
        category: category || generateNotificationCategory(payload.data.chatType),
        'thread-id': threadId || generateThreadId(payload.data.chatId),
        'mutable-content': 1, // Allow notification service extension
      },
      data: payload.data,
    };
  } catch (error) {
    console.error('🔔 NotificationUtils: Error formatting APNS payload:', error);
    return {
      aps: {
        alert: {
          title: payload.title,
          body: payload.body,
        },
        sound: 'default',
        badge: 1,
      },
      data: payload.data,
    };
  }
};

/**
 * Format notification for Android FCM
 */
export const formatFCMPayload = (
  payload: NotificationPayload,
  threadId?: string
): any => {
  try {
    return {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: 'ic_notification',
        color: '#007AFF',
        sound: payload.sound || 'default',
        tag: threadId || generateThreadId(payload.data.chatId),
        channel_id: 'messages',
        priority: payload.priority || 'high',
        visibility: 'public',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      data: {
        ...payload.data,
        threadId: threadId || generateThreadId(payload.data.chatId),
        timestamp: Date.now().toString(),
      },
      priority: payload.priority || 'high',
      android: {
        priority: 'high',
        notification: {
          sound: payload.sound || 'default',
          channel_id: 'messages',
          tag: threadId || generateThreadId(payload.data.chatId),
        },
      },
    };
  } catch (error) {
    console.error('🔔 NotificationUtils: Error formatting FCM payload:', error);
    return {
      notification: {
        title: payload.title,
        body: payload.body,
        sound: 'default',
      },
      data: payload.data,
      priority: 'high',
    };
  }
};

/**
 * Validate notification payload
 */
export const validateNotificationPayload = (payload: NotificationPayload): NotificationValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Required fields validation
    if (!payload.title || payload.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!payload.body || payload.body.trim().length === 0) {
      errors.push('Body is required');
    }

    if (!payload.data) {
      errors.push('Data is required');
    } else {
      // Data validation
      if (!payload.data.chatId) {
        errors.push('Chat ID is required');
      }

      if (!payload.data.messageId) {
        errors.push('Message ID is required');
      }

      if (!payload.data.senderId) {
        errors.push('Sender ID is required');
      }

      if (!payload.data.senderName) {
        errors.push('Sender name is required');
      }

      if (!payload.data.chatName) {
        errors.push('Chat name is required');
      }

      if (!payload.data.chatType || !['direct', 'group'].includes(payload.data.chatType)) {
        errors.push('Valid chat type is required');
      }
    }

    // Length validation
    if (payload.title && payload.title.length > 100) {
      warnings.push('Title is longer than recommended (100 characters)');
    }

    if (payload.body && payload.body.length > 200) {
      warnings.push('Body is longer than recommended (200 characters)');
    }

    // Priority validation
    if (payload.priority && !['high', 'normal'].includes(payload.priority)) {
      warnings.push('Invalid priority value');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error('🔔 NotificationUtils: Error validating payload:', error);
    return {
      isValid: false,
      errors: ['Validation error occurred'],
      warnings: [],
    };
  }
};

/**
 * Sanitize notification text to prevent issues
 */
export const sanitizeNotificationText = (text: string): string => {
  try {
    if (!text) return '';
    
    // Remove or replace problematic characters
    return text
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  } catch (error) {
    console.error('🔔 NotificationUtils: Error sanitizing text:', error);
    return text || '';
  }
};

/**
 * Generate notification ID for tracking
 */
export const generateNotificationId = (chatId: string, messageId: string): string => {
  try {
    return `msg_${chatId}_${messageId}_${Date.now()}`;
  } catch (error) {
    console.error('🔔 NotificationUtils: Error generating notification ID:', error);
    return `notif_${Date.now()}`;
  }
};

/**
 * Check if notification should be grouped with previous ones
 */
export const shouldGroupNotification = (
  currentChatId: string,
  previousChatId: string,
  timeDifference: number // milliseconds
): boolean => {
  try {
    // Group if same chat and within 5 minutes
    return currentChatId === previousChatId && timeDifference < 5 * 60 * 1000;
  } catch (error) {
    console.error('🔔 NotificationUtils: Error checking grouping:', error);
    return false;
  }
};

/**
 * Format notification for display in UI
 */
export const formatNotificationForDisplay = (payload: NotificationPayload): FormattedNotification => {
  try {
    return {
      title: payload.title,
      body: payload.body,
      subtitle: payload.data.chatType === 'group' ? payload.data.chatName : undefined,
      category: generateNotificationCategory(payload.data.chatType),
      threadId: generateThreadId(payload.data.chatId),
    };
  } catch (error) {
    console.error('🔔 NotificationUtils: Error formatting for display:', error);
    return {
      title: payload.title,
      body: payload.body,
    };
  }
};

/**
 * Extract notification data from various sources
 */
export const extractNotificationData = (source: any): NotificationData | null => {
  try {
    if (!source) return null;

    // Handle different notification formats
    const data = source.data || source;
    
    if (!data.chatId || !data.messageId || !data.senderId) {
      return null;
    }

    return {
      chatId: data.chatId,
      messageId: data.messageId,
      senderId: data.senderId,
      senderName: data.senderName || 'Unknown',
      chatName: data.chatName || 'Chat',
      chatType: data.chatType || 'direct',
      messageText: data.messageText || '',
    };
  } catch (error) {
    console.error('🔔 NotificationUtils: Error extracting notification data:', error);
    return null;
  }
};

export default {
  formatNotificationTitle,
  formatNotificationBody,
  formatNotificationSubtitle,
  generateThreadId,
  generateNotificationCategory,
  formatNotificationPayload,
  formatAPNSPayload,
  formatFCMPayload,
  validateNotificationPayload,
  sanitizeNotificationText,
  generateNotificationId,
  shouldGroupNotification,
  formatNotificationForDisplay,
  extractNotificationData,
};
