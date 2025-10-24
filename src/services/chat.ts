import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    Chat,
    ChatType,
    CreateChat,
    FirebaseError,
    Result,
    createError,
    isRetryableError
} from '../types';

class ChatService {
  private readonly CHATS_COLLECTION = 'chats';
  private readonly USERS_COLLECTION = 'users';

  /**
   * Create a new chat
   */
  async createChat(chatData: CreateChat): Promise<Result<Chat>> {
    try {
      // Validate chat data
      const validationResult = this.validateChat(chatData);
      if (!validationResult.success) {
        return validationResult;
      }

      // Create chat document
      const chatDocRef = await addDoc(collection(db, this.CHATS_COLLECTION), {
        ...chatData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        allowMemberInvites: chatData.allowMemberInvites ?? true,
        allowMemberMessages: chatData.allowMemberMessages ?? true,
        allowFileSharing: chatData.allowFileSharing ?? true,
        isArchived: false,
        isMuted: false,
        notificationSettings: chatData.notificationSettings ?? {
          soundEnabled: true,
          vibrationEnabled: true
        }
      });

      // Create the chat object with the actual document ID
      const chat: Chat = {
        id: chatDocRef.id,
        ...chatData,
        createdAt: new Date(),
        updatedAt: new Date(),
        allowMemberInvites: chatData.allowMemberInvites ?? true,
        allowMemberMessages: chatData.allowMemberMessages ?? true,
        allowFileSharing: chatData.allowFileSharing ?? true,
        isArchived: false,
        isMuted: false,
        notificationSettings: chatData.notificationSettings ?? {
          soundEnabled: true,
          vibrationEnabled: true
        }
      };

      return {
        success: true,
        data: chat
      };

    } catch (error: any) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to create chat',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to create chat'
        }))
      };
    }
  }

  /**
   * Get a specific chat by ID
   */
  async getChat(chatId: string): Promise<Result<Chat>> {
    try {
      console.log('🔍 ChatService.getChat called with chatId:', chatId);
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      console.log('🔍 Chat reference created:', chatRef.path);
      const chatDoc = await getDoc(chatRef);
      console.log('🔍 Chat document exists:', chatDoc.exists());

      if (!chatDoc.exists()) {
        return {
          success: false,
          error: createError<FirebaseError>({
            type: 'firebase',
            service: 'firestore',
            code: 'not-found',
            message: 'Chat not found'
          }),
          retryable: false
        };
      }

      const data = chatDoc.data();
      const chat: Chat = {
        id: chatDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastMessage: data.lastMessage ? {
          ...data.lastMessage,
          timestamp: data.lastMessage.timestamp?.toDate() || new Date()
        } : undefined
      } as Chat;

      return {
        success: true,
        data: chat
      };

    } catch (error: any) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get chat',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get chat'
        }))
      };
    }
  }

  /**
   * Get all chats for a user
   */
  async getUserChats(userId: string): Promise<Result<Chat[]>> {
    try {
      console.log('🔍 ChatService.getUserChats called for user:', userId);
      
      // Try the optimized query first (requires index)
      try {
        const q = query(
          collection(db, this.CHATS_COLLECTION),
          where('participants', 'array-contains', userId),
          orderBy('updatedAt', 'desc')
        );

        console.log('📡 Executing Firestore query with index...');
        const snapshot = await getDocs(q);
        console.log('📊 Query returned', snapshot.size, 'documents');
        
        const chats: Chat[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📝 Processing chat document:', doc.id);
          chats.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastMessage: data.lastMessage ? {
              ...data.lastMessage,
              timestamp: data.lastMessage.timestamp?.toDate() || new Date()
            } : undefined
          } as Chat);
        });

        console.log('✅ Successfully loaded', chats.length, 'chats');
        return {
          success: true,
          data: chats
        };
      } catch (indexError: any) {
        // If index error, try fallback query without orderBy
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          console.log('⚠️ Index not ready, trying fallback query...');
          
          const fallbackQuery = query(
            collection(db, this.CHATS_COLLECTION),
            where('participants', 'array-contains', userId)
          );

          const snapshot = await getDocs(fallbackQuery);
          const chats: Chat[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            chats.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              lastMessage: data.lastMessage ? {
                ...data.lastMessage,
                timestamp: data.lastMessage.timestamp?.toDate() || new Date()
              } : undefined
            } as Chat);
          });

          // Sort manually since we can't use orderBy
          chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

          console.log('✅ Fallback query loaded', chats.length, 'chats');
          return {
            success: true,
            data: chats
          };
        } else {
          throw indexError; // Re-throw if it's not an index error
        }
      }

    } catch (error: any) {
      console.error('💥 Error in ChatService.getUserChats:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get user chats',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get user chats'
        }))
      };
    }
  }

  /**
   * Create or get existing direct chat between two users
   * Automatically sets chat name to the other user's email
   */
  async getOrCreateDirectChat(userId1: string, userId2: string): Promise<Result<Chat>> {
    try {
      console.log('🔍 Looking for existing direct chat between:', userId1, userId2);
      
      // First, try to find existing direct chat
      const q = query(
        collection(db, this.CHATS_COLLECTION),
        where('type', '==', ChatType.DIRECT),
        where('participants', 'array-contains', userId1)
      );

      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.participants.includes(userId2) && data.participants.length === 2) {
          console.log('✅ Found existing direct chat:', doc.id);
          const chat: Chat = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastMessage: data.lastMessage ? {
              ...data.lastMessage,
              timestamp: data.lastMessage.timestamp?.toDate() || new Date()
            } : undefined
          } as Chat;
          
          return {
            success: true,
            data: chat
          };
        }
      }

      // No existing chat found, create new one
      console.log('🆕 Creating new direct chat');
      
      // Get the other user's email for naming
      const otherUserId = userId2; // The other user is userId2
      const otherUserResult = await this.getUserById(otherUserId);
      const otherUserEmail = otherUserResult.success ? otherUserResult.data?.email || 'Unknown User' : 'Unknown User';
      
      const createChatData: CreateChat = {
        type: ChatType.DIRECT,
        name: otherUserEmail, // Set name to other user's email
        participants: [userId1, userId2],
        createdBy: userId1,
        allowMemberInvites: false,
        allowMemberMessages: true,
        allowFileSharing: true,
        isArchived: false,
        isMuted: false,
        notificationSettings: {
          soundEnabled: true,
          vibrationEnabled: true
        }
      };

      return await this.createChat(createChatData);

    } catch (error: any) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get or create direct chat',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get or create direct chat'
        }))
      };
    }
  }

  /**
   * Update chat settings
   */
  async updateChat(chatId: string, updates: Partial<Chat>): Promise<Result<void>> {
    try {
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      await updateDoc(chatRef, {
        ...updates,
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
          message: error.message || 'Failed to update chat',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to update chat'
        }))
      };
    }
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<Result<void>> {
    try {
      console.log('🗑️ ChatService.deleteChat called for chatId:', chatId);
      
      // First, verify the chat exists and user has permission
      const chatResult = await this.getChat(chatId);
      if (!chatResult.success) {
        return {
          success: false,
          error: chatResult.error,
          retryable: chatResult.retryable
        };
      }

      // Delete the chat document
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      await deleteDoc(chatRef);

      console.log('✅ Chat deleted successfully:', chatId);
      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      console.error('💥 Error in ChatService.deleteChat:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to delete chat',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to delete chat'
        }))
      };
    }
  }

  /**
   * Add members to a chat
   */
  async addMembers(chatId: string, memberIds: string[]): Promise<Result<void>> {
    try {
      console.log('👥 ChatService.addMembers called for chatId:', chatId, 'members:', memberIds);
      
      // First, get the current chat
      const chatResult = await this.getChat(chatId);
      if (!chatResult.success) {
        return {
          success: false,
          error: chatResult.error,
          retryable: chatResult.retryable
        };
      }

      const chat = chatResult.data;
      
      // Check if chat allows member invites
      if (!chat.allowMemberInvites) {
        return {
          success: false,
          error: createError<FirebaseError>({
            type: 'firebase',
            service: 'firestore',
            code: 'permission-denied',
            message: 'This chat does not allow member invites'
          }),
          retryable: false
        };
      }

      // Add new members to existing participants (avoid duplicates)
      const currentParticipants = chat.participants || [];
      const newParticipants = [...currentParticipants];
      
      memberIds.forEach(memberId => {
        if (!newParticipants.includes(memberId)) {
          newParticipants.push(memberId);
        }
      });

      // Update the chat with new participants
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      await updateDoc(chatRef, {
        participants: newParticipants,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Members added successfully to chat:', chatId);
      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      console.error('💥 Error in ChatService.addMembers:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to add members',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to add members'
        }))
      };
    }
  }

  /**
   * Remove a member from a chat
   */
  async removeMember(chatId: string, memberId: string): Promise<Result<void>> {
    try {
      console.log('👋 ChatService.removeMember called for chatId:', chatId, 'memberId:', memberId);
      
      // First, get the current chat
      const chatResult = await this.getChat(chatId);
      if (!chatResult.success) {
        return {
          success: false,
          error: chatResult.error,
          retryable: chatResult.retryable
        };
      }

      const chat = chatResult.data;
      const currentParticipants = chat.participants || [];
      
      // Remove the member from participants
      const newParticipants = currentParticipants.filter(id => id !== memberId);
      
      // Ensure we don't remove all participants
      if (newParticipants.length === 0) {
        return {
          success: false,
          error: createError<FirebaseError>({
            type: 'firebase',
            service: 'firestore',
            code: 'invalid-argument',
            message: 'Cannot remove all participants from a chat'
          }),
          retryable: false
        };
      }

      // Update the chat with new participants
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      await updateDoc(chatRef, {
        participants: newParticipants,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Member removed successfully from chat:', chatId);
      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      console.error('💥 Error in ChatService.removeMember:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to remove member',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to remove member'
        }))
      };
    }
  }

  /**
   * Set up real-time listener for user's chats
   */
  subscribeToUserChats(
    userId: string,
    callback: (chats: Chat[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, this.CHATS_COLLECTION),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const chats: Chat[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          chats.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastMessage: data.lastMessage ? {
              ...data.lastMessage,
              timestamp: data.lastMessage.timestamp?.toDate() || new Date()
            } : undefined
          } as Chat);
        });
        callback(chats);
      },
      (error) => {
        console.error('Error listening to chats:', error);
        onError?.(error);
      }
    );
  }

  /**
   * Update chat name
   */
  async updateChatName(chatId: string, newName: string): Promise<Result<void>> {
    try {
      console.log('📝 Updating chat name:', chatId, 'to:', newName);
      
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      await updateDoc(chatRef, {
        name: newName,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Chat name updated successfully');
      return {
        success: true,
        data: undefined
      };

    } catch (error: any) {
      console.error('💥 Error updating chat name:', error);
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to update chat name',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to update chat name'
        }))
      };
    }
  }

  /**
   * Get user by ID (helper method for chat naming)
   */
  private async getUserById(userId: string): Promise<Result<{ email: string } | null>> {
    try {
      const userDoc = await getDoc(doc(db, this.USERS_COLLECTION, userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          success: true,
          data: { email: data.email || 'Unknown User' }
        };
      }
      
      return {
        success: true,
        data: null
      };
    } catch (error: any) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get user',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get user'
        }))
      };
    }
  }

  /**
   * Private helper methods
   */
  private validateChat(chatData: CreateChat): Result<void> {
    if (!chatData.type) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Chat type is required'
        }),
        retryable: false
      };
    }

    if (!chatData.participants || chatData.participants.length < 1) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Chat must have at least 1 participant'
        }),
        retryable: false
      };
    }

    // For direct chats, require exactly 2 participants
    if (chatData.type === ChatType.DIRECT && chatData.participants.length !== 2) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Direct chat must have exactly 2 participants'
        }),
        retryable: false
      };
    }

    if (!chatData.createdBy) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Chat creator is required'
        }),
        retryable: false
      };
    }

    if (!chatData.participants.includes(chatData.createdBy)) {
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: 'invalid-argument',
          message: 'Chat creator must be a participant'
        }),
        retryable: false
      };
    }

    return {
      success: true,
      data: undefined
    };
  }
}

export default new ChatService();
