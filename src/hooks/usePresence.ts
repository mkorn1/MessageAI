import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../firebase';
import presenceCache from '../services/presence';
import UserService from '../services/user';
import { Chat } from '../types/chat';
import { ChatPresence, UsePresenceReturn, UserPresence } from '../types/presence';
import {
    getOnlineCount,
    getPresenceSummary,
    hasPresenceChanged,
    validatePresenceData
} from '../utils/presenceUtils';

/**
 * Custom hook for managing real-time presence data for chat participants
 * Integrates with existing User.isOnline field and provides filtered online-only data
 */
export const usePresence = (chat: Chat | null): UsePresenceReturn => {
  const [presence, setPresence] = useState<ChatPresence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    if (!chat) {
      setPresence(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cachedPresence = presenceCache.get(chat.id);
      if (cachedPresence) {
        console.log('📦 Using cached presence data:', getPresenceSummary(cachedPresence));
        setPresence(cachedPresence);
        setIsLoading(false);
        return;
      }

      // Get user data for all participants
      const userIds = chat.participants || [];
      if (userIds.length === 0) {
        const emptyPresence: ChatPresence = {
          chatId: chat.id,
          participants: [],
          onlineCount: 0,
          totalCount: 0,
        };
        presenceCache.set(chat.id, emptyPresence);
        setPresence(emptyPresence);
        setIsLoading(false);
        return;
      }

      console.log('🌐 Fetching fresh presence data for chat:', chat.id);
      const usersResult = await UserService.getUsersByIds(userIds);
      if (!usersResult.success) {
        throw new Error(usersResult.error?.message || 'Failed to fetch user data');
      }

      const users = usersResult.data || [];
      const participants: UserPresence[] = users.map(user => ({
        userId: user.uid,
        isOnline: user.isOnline || false, // Use existing isOnline field
        lastSeen: user.lastSeen,
        displayName: user.displayName,
      }));

      const onlineCount = getOnlineCount(participants);
      
      const chatPresence: ChatPresence = {
        chatId: chat.id,
        participants,
        onlineCount,
        totalCount: participants.length,
      };

      // Validate presence data before setting
      if (validatePresenceData(chatPresence)) {
        // Cache the data for future use
        presenceCache.set(chat.id, chatPresence);
        setPresence(chatPresence);
        console.log('✅ Presence data refreshed and cached:', getPresenceSummary(chatPresence));
      } else {
        console.error('❌ Invalid presence data received');
        setError(new Error('Invalid presence data'));
      }

    } catch (err) {
      console.error('Error refreshing presence data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [chat]);

  // Set up real-time listener for user presence updates
  useEffect(() => {
    if (!chat || !chat.participants || chat.participants.length === 0) {
      setPresence(null);
      setIsLoading(false);
      return;
    }

    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    try {
      const userIds = chat.participants;
      console.log('🔍 Setting up presence listener for chat:', chat.id, 'with participants:', userIds);
      
      // Set up optimized real-time listener for specific user documents
      // Using individual document listeners for better performance
      const unsubscribeFunctions: (() => void)[] = [];
      
      userIds.forEach(userId => {
        const userDocRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            if (!docSnapshot.exists()) {
              console.warn('User document not found:', userId);
              return;
            }

            const data = docSnapshot.data();
            const user = {
              uid: docSnapshot.id,
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

            // Update presence state with the new user data
            setPresence(prevPresence => {
              if (!prevPresence) {
                const newPresence: ChatPresence = {
                  chatId: chat.id,
                  participants: [{
                    userId: user.uid,
                    isOnline: user.isOnline,
                    lastSeen: user.lastSeen,
                    displayName: user.displayName,
                  }],
                  onlineCount: user.isOnline ? 1 : 0,
                  totalCount: 1,
                };
                
                if (validatePresenceData(newPresence)) {
                  console.log('✅ Initial presence data:', getPresenceSummary(newPresence));
                  return newPresence;
                }
                return null;
              }

              // Update existing participant or add new one
              const existingIndex = prevPresence.participants.findIndex(p => p.userId === userId);
              const updatedParticipant = {
                userId: user.uid,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
                displayName: user.displayName,
              };

              let updatedParticipants;
              if (existingIndex >= 0) {
                updatedParticipants = [...prevPresence.participants];
                updatedParticipants[existingIndex] = updatedParticipant;
              } else {
                updatedParticipants = [...prevPresence.participants, updatedParticipant];
              }

              const onlineCount = getOnlineCount(updatedParticipants);
              const newPresence: ChatPresence = {
                ...prevPresence,
                participants: updatedParticipants,
                onlineCount,
                totalCount: updatedParticipants.length,
              };

              // Only update if data has actually changed
              if (hasPresenceChanged(prevPresence, newPresence)) {
                if (validatePresenceData(newPresence)) {
                  // Update cache with new data
                  presenceCache.set(chat.id, newPresence);
                  console.log('✅ Presence updated and cached:', getPresenceSummary(newPresence));
                  return newPresence;
                } else {
                  console.error('❌ Invalid updated presence data');
                  return prevPresence; // Keep previous valid data
                }
              }

              return prevPresence; // No change needed
            });

            setError(null);
          },
          (err) => {
            console.error('Presence listener error for user', userId, ':', err);
            setError(err instanceof Error ? err : new Error(`Listener error for user ${userId}`));
          }
        );
        
        unsubscribeFunctions.push(unsubscribe);
      });

      // Create a combined unsubscribe function
      unsubscribeRef.current = () => {
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      };

      console.log('✅ Presence listeners set up for', userIds.length, 'participants');

    } catch (err) {
      console.error('Error setting up presence listeners:', err);
      setError(err instanceof Error ? err : new Error('Setup error'));
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [chat]);

  // Cleanup cache when component unmounts
  useEffect(() => {
    return () => {
      if (chat) {
        // Extend TTL for active chats instead of deleting
        presenceCache.extendTTL(chat.id, 60000); // Extend by 1 minute
      }
    };
  }, [chat]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    presence,
    isLoading,
    error,
    refresh,
  };
};

export default usePresence;
