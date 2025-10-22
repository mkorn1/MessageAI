import { ChatPresence, UserPresence } from '../types/presence';

/**
 * Utility functions for presence data filtering and processing
 * Implements online-only filtering as per PRD requirements
 */

/**
 * Filters participants to only include online users
 * @param participants Array of user presence data
 * @returns Array containing only online participants
 */
export const filterOnlineParticipants = (participants: UserPresence[]): UserPresence[] => {
  return participants.filter(participant => participant.isOnline === true);
};

/**
 * Calculates the count of online participants
 * @param participants Array of user presence data
 * @returns Number of online participants
 */
export const getOnlineCount = (participants: UserPresence[]): number => {
  return participants.filter(participant => participant.isOnline === true).length;
};

/**
 * Calculates the count of offline participants
 * @param participants Array of user presence data
 * @returns Number of offline participants
 */
export const getOfflineCount = (participants: UserPresence[]): number => {
  return participants.filter(participant => participant.isOnline === false).length;
};

/**
 * Creates a filtered ChatPresence object with only online participants
 * @param chatPresence Original chat presence data
 * @returns Filtered chat presence with only online participants
 */
export const filterChatPresenceToOnlineOnly = (chatPresence: ChatPresence): ChatPresence => {
  const onlineParticipants = filterOnlineParticipants(chatPresence.participants);
  
  return {
    chatId: chatPresence.chatId,
    participants: onlineParticipants,
    onlineCount: onlineParticipants.length,
    totalCount: chatPresence.totalCount, // Keep original total for reference
  };
};

/**
 * Determines if a user should be displayed in presence indicators
 * @param participant User presence data
 * @returns True if user should be displayed (online and visible)
 */
export const shouldDisplayUser = (participant: UserPresence): boolean => {
  return participant.isOnline === true;
};

/**
 * Gets display name for a participant, with fallback to userId
 * @param participant User presence data
 * @returns Display name or userId as fallback
 */
export const getParticipantDisplayName = (participant: UserPresence): string => {
  return participant.displayName || participant.userId;
};

/**
 * Sorts participants by online status (online first) and then by display name
 * @param participants Array of user presence data
 * @returns Sorted array with online users first
 */
export const sortParticipantsByPresence = (participants: UserPresence[]): UserPresence[] => {
  return [...participants].sort((a, b) => {
    // Online users first
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    
    // Then sort by display name
    const nameA = getParticipantDisplayName(a).toLowerCase();
    const nameB = getParticipantDisplayName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

/**
 * Validates presence data integrity
 * @param chatPresence Chat presence data to validate
 * @returns True if data is valid, false otherwise
 */
export const validatePresenceData = (chatPresence: ChatPresence | null): boolean => {
  if (!chatPresence) return false;
  
  // Check required fields
  if (!chatPresence.chatId || !Array.isArray(chatPresence.participants)) {
    return false;
  }
  
  // Validate participants array
  for (const participant of chatPresence.participants) {
    if (!participant.userId || typeof participant.isOnline !== 'boolean') {
      return false;
    }
  }
  
  // Validate counts match actual data
  const actualOnlineCount = getOnlineCount(chatPresence.participants);
  if (chatPresence.onlineCount !== actualOnlineCount) {
    console.warn('Presence data inconsistency: onlineCount mismatch', {
      declared: chatPresence.onlineCount,
      actual: actualOnlineCount
    });
  }
  
  return true;
};

/**
 * Creates a summary string for presence data (for debugging/logging)
 * @param chatPresence Chat presence data
 * @returns Human-readable summary string
 */
export const getPresenceSummary = (chatPresence: ChatPresence | null): string => {
  if (!chatPresence) return 'No presence data';
  
  const onlineCount = getOnlineCount(chatPresence.participants);
  const offlineCount = getOfflineCount(chatPresence.participants);
  
  return `Chat ${chatPresence.chatId}: ${onlineCount} online, ${offlineCount} offline (${chatPresence.totalCount} total)`;
};

/**
 * Checks if presence data has changed (for optimization)
 * @param oldPresence Previous presence data
 * @param newPresence New presence data
 * @returns True if data has changed, false otherwise
 */
export const hasPresenceChanged = (
  oldPresence: ChatPresence | null, 
  newPresence: ChatPresence | null
): boolean => {
  if (!oldPresence && !newPresence) return false;
  if (!oldPresence || !newPresence) return true;
  
  // Check if online count changed
  if (oldPresence.onlineCount !== newPresence.onlineCount) return true;
  
  // Check if any participant's online status changed
  const oldParticipants = oldPresence.participants;
  const newParticipants = newPresence.participants;
  
  if (oldParticipants.length !== newParticipants.length) return true;
  
  for (let i = 0; i < oldParticipants.length; i++) {
    const oldParticipant = oldParticipants[i];
    const newParticipant = newParticipants.find(p => p.userId === oldParticipant.userId);
    
    if (!newParticipant || oldParticipant.isOnline !== newParticipant.isOnline) {
      return true;
    }
  }
  
  return false;
};
