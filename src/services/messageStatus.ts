import {
    addDoc,
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import { createError, FirebaseError, isRetryableError, Result } from '../types';
import { MessageStatus, MessageStatusType, MessageStatusUpdate } from '../types/messageStatus';

export class MessageStatusService {
  private readonly MESSAGE_STATUSES_COLLECTION = 'message_statuses';
  private readonly statusUpdateThrottle = new Map<string, number>();
  private readonly THROTTLE_DELAY = 1000; // 1 second throttle

  /**
   * Add a new message status
   */
  async addMessageStatus(update: MessageStatusUpdate): Promise<Result<MessageStatus>> {
    try {
      const statusData = {
        messageId: update.messageId,
        status: update.status,
        userId: update.userId || null,
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.MESSAGE_STATUSES_COLLECTION), statusData);
      
      // Get the created document to return with proper timestamp
      const createdDoc = await getDocs(query(
        collection(db, this.MESSAGE_STATUSES_COLLECTION),
        where('__name__', '==', docRef.id),
        limit(1)
      ));

      if (createdDoc.empty) {
        throw new Error('Failed to retrieve created message status');
      }

      const docData = createdDoc.docs[0].data();
      const messageStatus: MessageStatus = {
        id: docRef.id,
        messageId: docData.messageId,
        status: docData.status,
        timestamp: docData.timestamp?.toDate() || new Date(),
        userId: docData.userId
      };

      console.log('✅ Added message status:', messageStatus);
      return {
        success: true,
        data: messageStatus
      };

    } catch (error: any) {
      console.error('❌ Failed to add message status:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to add message status',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to add message status'
        }))
      };
    }
  }

  /**
   * Get the latest status for a message
   */
  async getLatestMessageStatus(messageId: string): Promise<Result<MessageStatus | null>> {
    try {
      const q = query(
        collection(db, this.MESSAGE_STATUSES_COLLECTION),
        where('messageId', '==', messageId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return {
          success: true,
          data: null
        };
      }

      const docData = snapshot.docs[0].data();
      const messageStatus: MessageStatus = {
        id: snapshot.docs[0].id,
        messageId: docData.messageId,
        status: docData.status,
        timestamp: docData.timestamp?.toDate() || new Date(),
        userId: docData.userId
      };

      return {
        success: true,
        data: messageStatus
      };

    } catch (error: any) {
      console.error('❌ Failed to get latest message status:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get latest message status',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get latest message status'
        }))
      };
    }
  }

  /**
   * Get all statuses for multiple messages
   */
  async getMessageStatuses(messageIds: string[]): Promise<Result<{ [messageId: string]: MessageStatus }>> {
    try {
      if (messageIds.length === 0) {
        return {
          success: true,
          data: {}
        };
      }

      // Firestore 'in' queries are limited to 10 items, so we need to batch them
      const batches = [];
      for (let i = 0; i < messageIds.length; i += 10) {
        const batch = messageIds.slice(i, i + 10);
        batches.push(batch);
      }

      const allStatuses: { [messageId: string]: MessageStatus } = {};

      for (const batch of batches) {
        const q = query(
          collection(db, this.MESSAGE_STATUSES_COLLECTION),
          where('messageId', 'in', batch)
        );

        const snapshot = await getDocs(q);
        
        // Group by messageId and get the latest status for each
        const statusesByMessage: { [messageId: string]: MessageStatus[] } = {};
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const messageStatus: MessageStatus = {
            id: doc.id,
            messageId: data.messageId,
            status: data.status,
            timestamp: data.timestamp?.toDate() || new Date(),
            userId: data.userId
          };

          if (!statusesByMessage[data.messageId]) {
            statusesByMessage[data.messageId] = [];
          }
          statusesByMessage[data.messageId].push(messageStatus);
        });

        // Get the latest status for each message
        Object.keys(statusesByMessage).forEach(messageId => {
          const statuses = statusesByMessage[messageId];
          const latestStatus = statuses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
          allStatuses[messageId] = latestStatus;
        });
      }

      return {
        success: true,
        data: allStatuses
      };

    } catch (error: any) {
      console.error('❌ Failed to get message statuses:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get message statuses',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get message statuses'
        }))
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[], userId: string): Promise<Result<void>> {
    try {
      if (!messageIds.length || !userId) {
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

      const batch = writeBatch(db);
      
      messageIds.forEach((messageId) => {
        // Add to message_statuses collection
        const statusData = {
          messageId,
          status: MessageStatusType.READ,
          userId,
          timestamp: serverTimestamp()
        };
        
        const statusDocRef = doc(collection(db, this.MESSAGE_STATUSES_COLLECTION));
        batch.set(statusDocRef, statusData);

        // Also update the message document itself with readBy field
        // This will trigger the real-time listener, but our deduplication logic should handle it
        const messageDocRef = doc(db, 'messages', messageId);
        batch.update(messageDocRef, {
          [`readBy.${userId}`]: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`✅ Marked ${messageIds.length} messages as read for user ${userId}:`, messageIds);

      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      console.error('❌ Failed to mark messages as read:', error);
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
   * Subscribe to message status changes
   */
  subscribeToMessageStatuses(
    messageIds: string[],
    callback: (statuses: { [messageId: string]: MessageStatus }) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    if (messageIds.length === 0) {
      return () => {};
    }

    // Filter out messages that are already in final states
    const relevantMessageIds = messageIds.filter(messageId => {
      // Only track messages that might need status updates
      // Skip messages that are already READ or FAILED
      return true; // We'll let the hook handle filtering
    });

    if (relevantMessageIds.length === 0) {
      return () => {};
    }

    // Use real-time listeners instead of polling
    const unsubscribes: (() => void)[] = [];
    
    relevantMessageIds.forEach(messageId => {
      const q = query(
        collection(db, this.MESSAGE_STATUSES_COLLECTION),
        where('messageId', '==', messageId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          if (!snapshot.empty) {
            const docData = snapshot.docs[0].data();
            const messageStatus: MessageStatus = {
              id: snapshot.docs[0].id,
              messageId: docData.messageId,
              status: docData.status,
              timestamp: docData.timestamp?.toDate() || new Date(),
              userId: docData.userId
            };
            
            // Throttle status updates to prevent excessive logging
            const now = Date.now();
            const lastUpdate = this.statusUpdateThrottle.get(messageId) || 0;
            
            if (now - lastUpdate > this.THROTTLE_DELAY) {
              console.log('📡 Status update received:', messageStatus.messageId, '→', messageStatus.status);
              this.statusUpdateThrottle.set(messageId, now);
            }
            
            // Call callback with single status update
            callback({ [messageId]: messageStatus });
          }
        },
        (error) => {
          console.error('Error in message status listener:', error);
          if (errorCallback) {
            errorCallback(error);
          }
        }
      );
      
      unsubscribes.push(unsubscribe);
    });

    // Return cleanup function
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }
}

export const messageStatusService = new MessageStatusService();
