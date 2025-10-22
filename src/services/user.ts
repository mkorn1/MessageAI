import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { FirebaseError, Result, createError, isRetryableError } from '../types';
import { User } from '../types/user';

class UserService {
  private readonly USERS_COLLECTION = 'users';

  /**
   * Get all users (for member selection)
   */
  async getAllUsers(): Promise<Result<User[]>> {
    try {
      console.log('🔍 UserService.getAllUsers called');
      
      const q = query(collection(db, this.USERS_COLLECTION));
      const snapshot = await getDocs(q);
      
      const users: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          email: data.email || '',
          phoneNumber: data.phoneNumber || null,
          displayName: data.displayName,
          photoURL: data.photoURL,
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio,
          status: data.status,
          lastSeen: data.lastSeen?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          isOnline: data.isOnline || false,
          showOnlineStatus: data.showOnlineStatus ?? true,
          allowMessagesFrom: data.allowMessagesFrom || 'everyone',
          pushNotifications: data.pushNotifications ?? true,
          emailNotifications: data.emailNotifications ?? true,
          theme: data.theme || 'auto',
          language: data.language || 'en'
        });
      });

      console.log('✅ Successfully loaded', users.length, 'users');
      return {
        success: true,
        data: users
      };

    } catch (error: any) {
      console.error('💥 Error in UserService.getAllUsers:', error);
      
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get users',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get users'
        }))
      };
    }
  }

  /**
   * Search users by email
   */
  async searchUsersByEmail(emailQuery: string): Promise<Result<User[]>> {
    try {
      console.log('🔍 UserService.searchUsersByEmail called with:', emailQuery);
      
      if (!emailQuery.trim()) {
        return {
          success: true,
          data: []
        };
      }

      // Note: This is a simple implementation. For better performance,
      // you might want to implement a more sophisticated search
      const q = query(collection(db, this.USERS_COLLECTION));
      const snapshot = await getDocs(q);
      
      const users: User[] = [];
      const queryLower = emailQuery.toLowerCase().trim();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const email = data.email || '';
        
        if (email.toLowerCase().includes(queryLower)) {
          users.push({
            uid: doc.id,
            email: email,
            phoneNumber: data.phoneNumber || null,
            displayName: data.displayName,
            photoURL: data.photoURL,
            firstName: data.firstName,
            lastName: data.lastName,
            bio: data.bio,
            status: data.status,
            lastSeen: data.lastSeen?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            isOnline: data.isOnline || false,
            showOnlineStatus: data.showOnlineStatus ?? true,
            allowMessagesFrom: data.allowMessagesFrom || 'everyone',
            pushNotifications: data.pushNotifications ?? true,
            emailNotifications: data.emailNotifications ?? true,
            theme: data.theme || 'auto',
            language: data.language || 'en'
          });
        }
      });

      console.log('✅ Found', users.length, 'users matching email query');
      return {
        success: true,
        data: users
      };

    } catch (error: any) {
      console.error('💥 Error in UserService.searchUsersByEmail:', error);
      
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to search users',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to search users'
        }))
      };
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<Result<User | null>> {
    try {
      console.log('🔍 UserService.getUserByEmail called with:', email);
      
      const q = query(
        collection(db, this.USERS_COLLECTION),
        where('email', '==', email)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return {
          success: true,
          data: null
        };
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      const user: User = {
        uid: doc.id,
        email: data.email || '',
        phoneNumber: data.phoneNumber || null,
        displayName: data.displayName,
        photoURL: data.photoURL,
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
        status: data.status,
        lastSeen: data.lastSeen?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        isOnline: data.isOnline || false,
        showOnlineStatus: data.showOnlineStatus ?? true,
        allowMessagesFrom: data.allowMessagesFrom || 'everyone',
        pushNotifications: data.pushNotifications ?? true,
        emailNotifications: data.emailNotifications ?? true,
        theme: data.theme || 'auto',
        language: data.language || 'en'
      };

      console.log('✅ Found user:', user.uid);
      return {
        success: true,
        data: user
      };

    } catch (error: any) {
      console.error('💥 Error in UserService.getUserByEmail:', error);
      
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get user by email',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get user by email'
        }))
      };
    }
  }

  /**
   * Get multiple users by their UIDs
   */
  async getUsersByIds(userIds: string[]): Promise<Result<User[]>> {
    try {
      console.log('🔍 UserService.getUsersByIds called with:', userIds);
      
      if (userIds.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Firestore 'in' queries are limited to 10 items
      const chunks = [];
      for (let i = 0; i < userIds.length; i += 10) {
        chunks.push(userIds.slice(i, i + 10));
      }

      const allUsers: User[] = [];
      
      for (const chunk of chunks) {
        const q = query(
          collection(db, this.USERS_COLLECTION),
          where('__name__', 'in', chunk)
        );
        
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          const data = doc.data();
          allUsers.push({
            uid: doc.id,
            email: data.email || '',
            phoneNumber: data.phoneNumber || null,
            displayName: data.displayName,
            photoURL: data.photoURL,
            firstName: data.firstName,
            lastName: data.lastName,
            bio: data.bio,
            status: data.status,
            lastSeen: data.lastSeen?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            isOnline: data.isOnline || false,
            showOnlineStatus: data.showOnlineStatus ?? true,
            allowMessagesFrom: data.allowMessagesFrom || 'everyone',
            pushNotifications: data.pushNotifications ?? true,
            emailNotifications: data.emailNotifications ?? true,
            theme: data.theme || 'auto',
            language: data.language || 'en'
          });
        });
      }

      console.log('✅ Found', allUsers.length, 'users by IDs');
      return {
        success: true,
        data: allUsers
      };

    } catch (error: any) {
      console.error('💥 Error in UserService.getUsersByIds:', error);
      
      return {
        success: false,
        error: createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get users by IDs',
          originalError: error
        }),
        retryable: isRetryableError(createError<FirebaseError>({
          type: 'firebase',
          service: 'firestore',
          code: error.code || 'unknown',
          message: error.message || 'Failed to get users by IDs'
        }))
      };
    }
  }
}

export default new UserService();
