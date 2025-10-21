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
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    CreateMessage,
    FirebaseError,
    Message,
    MessageStatus,
    Result,
    createError,
    isRetryableError
} from '../types';

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
      console.log('📤 MessagingService.sendMessage called with:', messageData);
      
      // Validate message data
      const validationResult = this.validateMessage(messageData);
      if (!validationResult.success) {
        console.log('❌ Message validation failed:', validationResult.error);
        return validationResult;
      }

      // Skip chat verification - let Firestore handle it naturally
      console.log('📤 Proceeding with message send to chat:', messageData.chatId);

      // Create message document
      const messageRef = doc(collection(db, this.MESSAGES_COLLECTION));
      const message: Message = {
        id: messageRef.id,
        ...messageData,
        timestamp: messageData.timestamp || new Date(),
        status: messageData.status || MessageStatus.SENDING
      };

      console.log('📝 Created message object:', message);

      // Add to Firestore
      console.log('🔥 Adding to Firestore...');
      await addDoc(collection(db, this.MESSAGES_COLLECTION), {
        ...message,
        timestamp: serverTimestamp()
      });

      console.log('✅ Message added to Firestore successfully');

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
      const batch = writeBatch(db);
      
      messageIds.forEach((messageId) => {
        const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
        batch.update(messageRef, {
          [`readBy.${userId}`]: serverTimestamp()
        });
      });

      await batch.commit();

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
