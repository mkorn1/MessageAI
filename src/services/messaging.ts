import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    startAfter,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    CreateMessage,
    FirebaseError,
    Message,
    Result,
    createError,
    isRetryableError
} from '../types';
import { MessageStatusType } from '../types/messageStatus';
import activeChatService from './activeChatService';
import ChatService from './chat';
import { messageStatusService } from './messageStatus';
import notificationService from './notificationService';

class MessagingService {
  private readonly MESSAGES_COLLECTION = 'messages';
  private readonly CHATS_COLLECTION = 'chats';
  private readonly USERS_COLLECTION = 'users';
  private readonly MESSAGE_BATCH_SIZE = 50;

  /**
   * Send a new message to a chat
   */
  async sendMessage(messageData: CreateMessage): Promise<Result<Message>> {
    try {
      // Validate message data
      const validationResult = this.validateMessage(messageData);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
          retryable: validationResult.retryable
        };
      }

      // Create message document
      const messageRef = doc(collection(db, this.MESSAGES_COLLECTION));
      const message: Message = {
        id: messageRef.id,
        ...messageData,
        timestamp: messageData.timestamp || new Date()
      };

      // Add to Firestore
      await addDoc(collection(db, this.MESSAGES_COLLECTION), {
        ...message,
        timestamp: serverTimestamp()
      });

      // Add initial SENDING status
      await messageStatusService.addMessageStatus({
        messageId: message.id,
        status: MessageStatusType.SENDING
      });

      // Update status to SENT
      await messageStatusService.addMessageStatus({
        messageId: message.id,
        status: MessageStatusType.SENT
      });

      // Trigger notification checks (non-blocking)
      this.triggerNotificationChecks(message).catch(() => {
        // Silent fail for non-critical notification checks
      });

      // Update chat's last message (non-blocking)
      this.updateChatLastMessage(message.chatId, {
        id: message.id,
        text: message.text,
        senderId: message.senderId,
        timestamp: message.timestamp
      }).catch(() => {
        // Silent fail for non-critical chat update
      });

      return {
        success: true,
        data: message
      };

    } catch (error: any) {
      return this.createFirebaseError(error, 'Failed to send message');
    }
  }

  /**
   * Get messages for a specific chat with pagination
   */
  async getMessages(
    chatId: string, 
    lastMessageId?: string, 
    limitCount: number = this.MESSAGE_BATCH_SIZE
  ): Promise<Result<Message[]>> {
    try {
      let q = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      // Add pagination if lastMessageId is provided
      if (lastMessageId) {
        const lastMessageDoc = await getDoc(doc(db, this.MESSAGES_COLLECTION, lastMessageId));
        if (lastMessageDoc.exists()) {
          q = query(q, startAfter(lastMessageDoc));
        }
      }

      const snapshot = await getDocs(q);
      const messages: Message[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as Message);
      });

      return {
        success: true,
        data: messages.reverse() // Reverse to show oldest first
      };

    } catch (error: any) {
      return this.createFirebaseError(error, 'Failed to get messages');
    }
  }

  /**
   * Update message status (sending -> sent -> delivered -> read)
   */
  async updateMessageStatus(
    messageId: string, 
    status: MessageStatusType
  ): Promise<Result<void>> {
    try {
      const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
      await updateDoc(messageRef, {
        status,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      return this.createFirebaseError(error, 'Failed to update message status');
    }
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string, 
    newText: string
  ): Promise<Result<void>> {
    try {
      const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
      await updateDoc(messageRef, {
        text: newText,
        editedAt: serverTimestamp()
      });

      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      return this.createFirebaseError(error, 'Failed to edit message');
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<Result<void>> {
    try {
      const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
      await updateDoc(messageRef, {
        deletedAt: serverTimestamp()
      });

      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      return this.createFirebaseError(error, 'Failed to delete message');
    }
  }

  /**
   * Set up real-time listener for messages in a chat
   * Note: This listener will receive updates when:
   * - New messages are added
   * - Messages are marked as read (readBy field updates)
   * - Message status changes
   * The client should handle deduplication of these updates
   */
  subscribeToMessages(
    chatId: string,
    callback: (messages: Message[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, this.MESSAGES_COLLECTION),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          } as Message);
        });
        callback(messages);
      },
      (error) => {
        onError?.(error);
      }
    );
  }

  /**
   * Mark messages as read for a user in a chat
   */
  async markMessagesAsRead(
    chatId: string, 
    userId: string, 
    messageIds: string[]
  ): Promise<Result<void>> {
    try {
      // Validate inputs
      const validationResult = this.validateMarkAsReadParams(chatId, userId, messageIds);
      if (!validationResult.success) {
        return validationResult;
      }

      // Get existing message IDs
      const existingMessageIds = await this.getExistingMessageIds(messageIds);
      if (existingMessageIds.length === 0) {
        return { success: true, data: undefined };
      }

      // Use the message status service
      const result = await messageStatusService.markMessagesAsRead(existingMessageIds, userId);
      
      if (result.success) {
        // Trigger notification badge update (non-blocking)
        this.updateNotificationBadge(userId, chatId).catch(() => {
          // Silent fail for non-critical notification badge update
        });
      }

      return result;

    } catch (error: any) {
      // Handle specific case where message doesn't exist (optimistic message)
      if (error.code === 'not-found') {
        return { success: true, data: undefined };
      }
      
      return this.createFirebaseError(error, 'Failed to mark messages as read');
    }
  }

  /**
   * Mark all unread messages in a chat as read for a user
   */
  async markAllMessagesAsRead(
    chatId: string, 
    userId: string
  ): Promise<Result<void>> {
    try {
      // Validate inputs
      if (!chatId || !userId) {
        return {
          success: false,
          error: createError<FirebaseError>({
            type: 'firebase',
            service: 'firestore',
            code: 'invalid-argument',
            message: 'Invalid parameters for markAllMessagesAsRead'
          }),
          retryable: false
        };
      }

      // Get all messages in the chat
      const messagesQuery = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'desc')
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (messagesSnapshot.empty) {
        console.log(`📭 No unread messages found for user ${userId} in chat ${chatId}`);
        return {
          success: true,
          data: undefined
        };
      }

      // Filter messages that haven't been read by this user (excluding sender's own messages)
      const unreadMessages: string[] = [];
      messagesSnapshot.forEach((doc) => {
        const messageData = doc.data();
        const readBy = messageData.readBy || {};
        
        // Skip sender's own messages and messages already read by this user
        if (messageData.senderId !== userId && !readBy[userId]) {
          unreadMessages.push(doc.id);
        }
      });

      if (unreadMessages.length === 0) {
        console.log(`✅ All messages already read by user ${userId} in chat ${chatId}`);
        return {
          success: true,
          data: undefined
        };
      }

      // Mark all unread messages as read
      const result = await this.markMessagesAsRead(chatId, userId, unreadMessages);
      
      if (result.success) {
        console.log(`✅ Marked all ${unreadMessages.length} unread messages as read for user ${userId} in chat ${chatId}`);
        
        // Trigger notification badge update (non-blocking)
        this.updateNotificationBadge(userId, chatId).catch(error => {
          console.log('⚠️ Notification badge update failed (non-critical):', error);
        });
      }

      return result;

    } catch (error: any) {
      console.error('❌ Failed to mark all messages as read:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to mark all messages as read',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to mark all messages as read'
        }))
      };
    }
  }

  /**
   * Get read count for a message in group chats
   */
  async getMessageReadCount(
    messageId: string,
    totalParticipants: number,
    senderId: string
  ): Promise<Result<{ readCount: number; totalCount: number }>> {
    try {
      if (!messageId || totalParticipants <= 0) {
        return {
          success: false,
          error: createError<FirebaseError>({
            type: 'firebase',
            service: 'firestore',
            code: 'invalid-argument',
            message: 'Invalid parameters for getMessageReadCount'
          }),
          retryable: false
        };
      }

      const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        return {
          success: false,
          error: createError<FirebaseError>({
            type: 'firebase',
            service: 'firestore',
            code: 'not-found',
            message: 'Message not found'
          }),
          retryable: false
        };
      }

      const messageData = messageDoc.data();
      const readBy = messageData.readBy || {};
      
      // Count unique readers (excluding sender)
      const readers = Object.keys(readBy).filter(userId => userId !== senderId);
      const readCount = readers.length;
      
      // Total count excludes sender
      const totalCount = totalParticipants - 1;

      return {
        success: true,
        data: {
          readCount,
          totalCount
        }
      };

    } catch (error: any) {
      console.error('❌ Failed to get message read count:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get message read count',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get message read count'
        }))
      };
    }
  }

  /**
   * Trigger notification checks for a new message
   */
  private async triggerNotificationChecks(message: Message): Promise<void> {
    try {
      console.log('🔔 MessagingService: Triggering notification checks for message:', message.id);
      
      // Check if user is currently viewing this chat
      const isInActiveChat = activeChatService.isInSpecificChat(message.chatId);
      
      if (isInActiveChat) {
        console.log('🔔 MessagingService: User is in active chat, skipping notification checks');
        return;
      }
      
      // Check if notifications are enabled
      const notificationsEnabled = await notificationService.areNotificationsEnabled();
      if (!notificationsEnabled) {
        console.log('🔔 MessagingService: Notifications disabled, skipping checks');
        return;
      }
      
      // Get chat type for better notification suppression logic
      let chatType: 'direct' | 'group' = 'direct'; // Default to direct
      try {
        const chatResult = await ChatService.getChat(message.chatId);
        if (chatResult.success) {
          chatType = (chatResult.data.type === 'group' ? 'group' : 'direct') as 'direct' | 'group';
        }
      } catch (error) {
        console.log('🔔 MessagingService: Could not fetch chat type, using default:', error);
      }
      
      // Trigger notification service to check if notification should be sent
      // This will check preferences, quiet hours, etc.
      await notificationService.checkAndSendNotification({
        chatId: message.chatId,
        messageId: message.id,
        senderId: message.senderId,
        messageText: message.text,
        timestamp: message.timestamp,
        chatType: chatType
      });
      
    } catch (error) {
      console.error('🔔 MessagingService: Error in notification checks:', error);
    }
  }

  /**
   * Update notification badge count when messages are read
   */
  private async updateNotificationBadge(userId: string, chatId: string): Promise<void> {
    try {
      console.log('🔔 MessagingService: Updating notification badge for user:', userId);
      
      // Get unread message count for this chat
      const unreadCount = await this.getUnreadMessageCount(chatId, userId);
      
      if (unreadCount > 0) {
        // Update badge count
        await notificationService.setBadgeCount(unreadCount);
      } else {
        // Clear badge if no unread messages
        await notificationService.clearBadgeCount();
      }
      
    } catch (error) {
      console.error('🔔 MessagingService: Error updating notification badge:', error);
    }
  }

  /**
   * Get unread message count for a user in a chat
   */
  private async getUnreadMessageCount(chatId: string, userId: string): Promise<number> {
    try {
      const messagesQuery = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'desc')
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      
      let unreadCount = 0;
      messagesSnapshot.forEach((doc) => {
        const messageData = doc.data();
        const readBy = messageData.readBy || {};
        
        // Count unread messages (excluding sender's own messages)
        if (messageData.senderId !== userId && !readBy[userId]) {
          unreadCount++;
        }
      });

      return unreadCount;
    } catch (error) {
      console.error('🔔 MessagingService: Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Private helper methods
   */
  private createFirebaseError(error: any, defaultMessage: string): Result<never> {
    return {
      success: false,
      error: createError<FirebaseError>({
        type: 'firebase',
        service: 'firestore',
        code: error.code || 'unknown',
        message: error.message || defaultMessage,
        originalError: error
      }),
      retryable: isRetryableError(createError<FirebaseError>({
        type: 'firebase',
        service: 'firestore',
        code: error.code || 'unknown',
        message: error.message || defaultMessage
      }))
    };
  }

  private validateMarkAsReadParams(chatId: string, userId: string, messageIds: string[]): Result<void> {
    if (!chatId || !userId || !messageIds.length) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Invalid parameters for markMessagesAsRead'
        }),
        retryable: false
      };
    }
    return { success: true, data: undefined };
  }

  private async getExistingMessageIds(messageIds: string[]): Promise<string[]> {
    const validMessageIds = messageIds.filter(id => id && typeof id === 'string');
    if (validMessageIds.length === 0) return [];

    const existingMessageIds: string[] = [];
    for (const messageId of validMessageIds) {
      try {
        const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
        const messageDoc = await getDoc(messageRef);
        if (messageDoc.exists()) {
          existingMessageIds.push(messageId);
        }
      } catch (error) {
        // Silent error handling for individual message checks
      }
    }
    return existingMessageIds;
  }

  private validateMessage(messageData: CreateMessage): Result<void> {
    if (!messageData.text?.trim()) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Message text cannot be empty'
        }),
        retryable: false
      };
    }

    if (!messageData.senderId) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Sender ID is required'
        }),
        retryable: false
      };
    }

    if (!messageData.chatId) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Chat ID is required'
        }),
        retryable: false
      };
    }

    return {
      success: true,
      data: undefined
    };
  }

  private async updateChatLastMessage(
    chatId: string, 
    lastMessage: { id: string; text: string; senderId: string; timestamp: Date }
  ): Promise<void> {
    try {
      console.log('🔄 Updating chat last message for chat:', chatId);
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      await updateDoc(chatRef, {
        lastMessage,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Chat last message updated successfully');
    } catch (error) {
      console.log('⚠️ Failed to update chat last message (non-critical):', error);
      // Don't throw here as message was already sent successfully
      // This is a non-critical operation that can fail due to timing issues
    }
  }
}

export default new MessagingService();
