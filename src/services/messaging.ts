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
import { messageStatusService } from './messageStatus';

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
      console.log('📤 MessagingService.sendMessage called');
      
      // Validate message data
      const validationResult = this.validateMessage(messageData);
      if (!validationResult.success) {
        console.log('❌ Message validation failed:', validationResult.error);
        return validationResult;
      }

      // Skip chat verification - let Firestore handle it naturally
      console.log('📤 Proceeding with message send');

      // Create message document
      const messageRef = doc(collection(db, this.MESSAGES_COLLECTION));
      const message: Message = {
        id: messageRef.id,
        ...messageData,
        timestamp: messageData.timestamp || new Date()
      };

      console.log('📝 Created message object');

      // Add to Firestore
      console.log('🔥 Adding to Firestore');
      await addDoc(collection(db, this.MESSAGES_COLLECTION), {
        ...message,
        timestamp: serverTimestamp()
      });

      // Add initial SENDING status
      await messageStatusService.addMessageStatus({
        messageId: message.id,
        status: MessageStatusType.SENDING
      });

      console.log('✅ Message added to Firestore successfully');

      // Update status to SENT
      await messageStatusService.addMessageStatus({
        messageId: message.id,
        status: MessageStatusType.SENT
      });

      console.log('✅ Message status updated to SENT');

      // Update chat's last message (non-blocking)
      console.log('🔄 Updating chat last message...');
      this.updateChatLastMessage(message.chatId, {
        id: message.id,
        text: message.text,
        senderId: message.senderId,
        timestamp: message.timestamp
      }).catch(error => {
        console.log('⚠️ Chat last message update failed (non-critical):', error);
      });

      return {
        success: true,
        data: message
      };

    } catch (error: any) {
      console.log('💥 Error in MessagingService.sendMessage:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to send message',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to send message'
        }))
      };
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
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get messages',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get messages'
        }))
      };
    }
  }

  /**
   * Update message status (sending -> sent -> delivered -> read)
   */
  async updateMessageStatus(
    messageId: string, 
    status: MessageStatus
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
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to update message status',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to update message status'
        }))
      };
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
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to edit message',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to edit message'
        }))
      };
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
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to delete message',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to delete message'
        }))
      };
    }
  }

  /**
   * Set up real-time listener for messages in a chat
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
        console.error('Error listening to messages:', error);
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

      // Filter out empty message IDs and validate
      const validMessageIds = messageIds.filter(id => id && typeof id === 'string');
      if (validMessageIds.length === 0) {
        return {
          success: true,
          data: undefined
        };
      }

      // Check which messages actually exist in Firestore
      const existingMessageIds: string[] = [];
      for (const messageId of validMessageIds) {
        try {
          const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
          const messageDoc = await getDoc(messageRef);
          if (messageDoc.exists()) {
            existingMessageIds.push(messageId);
          } else {
            console.log(`⚠️ Message ${messageId} not found in Firestore, skipping...`);
          }
        } catch (error) {
          console.log(`⚠️ Error checking message ${messageId}:`, error);
        }
      }

      if (existingMessageIds.length === 0) {
        console.log('📭 No existing messages to mark as read');
        return {
          success: true,
          data: undefined
        };
      }

      // Use the new message status service
      const result = await messageStatusService.markMessagesAsRead(existingMessageIds, userId);
      
      if (result.success) {
        console.log(`✅ Marked ${existingMessageIds.length} messages as read for user ${userId} in chat ${chatId}`);
      } else {
        console.error('❌ Failed to mark messages as read via status service:', result.error);
      }

      return result;

    } catch (error: any) {
      console.error('❌ Failed to mark messages as read:', error);
      
      // Handle specific case where message doesn't exist (optimistic message)
      if (error.code === 'not-found') {
        console.log('⚠️ Some messages not found in Firestore (likely optimistic messages), continuing...');
        return {
          success: true,
          data: undefined
        };
      }
      
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to mark messages as read',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to mark messages as read'
        }))
      };
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
   * Private helper methods
   */
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
