import {
    filterChatPresenceToOnlineOnly,
    filterOnlineParticipants,
    getOfflineCount,
    getOnlineCount,
    getParticipantDisplayName,
    getPresenceSummary,
    hasPresenceChanged,
    shouldDisplayUser,
    sortParticipantsByPresence,
    validatePresenceData,
} from '../presenceUtils';
import { ChatPresence, UserPresence } from '../types/presence';

describe('PresenceUtils', () => {
  const mockParticipants: UserPresence[] = [
    {
      userId: 'user-1',
      isOnline: true,
      displayName: 'User One',
      lastSeen: new Date(),
    },
    {
      userId: 'user-2',
      isOnline: false,
      displayName: 'User Two',
      lastSeen: new Date(),
    },
    {
      userId: 'user-3',
      isOnline: true,
      displayName: 'User Three',
      lastSeen: new Date(),
    },
    {
      userId: 'user-4',
      isOnline: false,
      displayName: 'User Four',
      lastSeen: new Date(),
    },
  ];

  const mockChatPresence: ChatPresence = {
    chatId: 'chat-1',
    participants: mockParticipants,
    onlineCount: 2,
    totalCount: 4,
  };

  describe('filterOnlineParticipants', () => {
    it('should filter to only online participants', () => {
      const onlineParticipants = filterOnlineParticipants(mockParticipants);
      
      expect(onlineParticipants).toHaveLength(2);
      expect(onlineParticipants.every(p => p.isOnline)).toBe(true);
      expect(onlineParticipants.map(p => p.userId)).toEqual(['user-1', 'user-3']);
    });

    it('should return empty array when no online participants', () => {
      const offlineParticipants = mockParticipants.map(p => ({ ...p, isOnline: false }));
      const result = filterOnlineParticipants(offlineParticipants);
      
      expect(result).toHaveLength(0);
    });

    it('should return all participants when all are online', () => {
      const onlineParticipants = mockParticipants.map(p => ({ ...p, isOnline: true }));
      const result = filterOnlineParticipants(onlineParticipants);
      
      expect(result).toHaveLength(4);
      expect(result.every(p => p.isOnline)).toBe(true);
    });
  });

  describe('getOnlineCount', () => {
    it('should return correct count of online participants', () => {
      expect(getOnlineCount(mockParticipants)).toBe(2);
    });

    it('should return 0 when no online participants', () => {
      const offlineParticipants = mockParticipants.map(p => ({ ...p, isOnline: false }));
      expect(getOnlineCount(offlineParticipants)).toBe(0);
    });

    it('should return total count when all participants are online', () => {
      const onlineParticipants = mockParticipants.map(p => ({ ...p, isOnline: true }));
      expect(getOnlineCount(onlineParticipants)).toBe(4);
    });
  });

  describe('getOfflineCount', () => {
    it('should return correct count of offline participants', () => {
      expect(getOfflineCount(mockParticipants)).toBe(2);
    });

    it('should return 0 when no offline participants', () => {
      const onlineParticipants = mockParticipants.map(p => ({ ...p, isOnline: true }));
      expect(getOfflineCount(onlineParticipants)).toBe(0);
    });

    it('should return total count when all participants are offline', () => {
      const offlineParticipants = mockParticipants.map(p => ({ ...p, isOnline: false }));
      expect(getOfflineCount(offlineParticipants)).toBe(4);
    });
  });

  describe('filterChatPresenceToOnlineOnly', () => {
    it('should filter chat presence to only online participants', () => {
      const filtered = filterChatPresenceToOnlineOnly(mockChatPresence);
      
      expect(filtered.chatId).toBe('chat-1');
      expect(filtered.participants).toHaveLength(2);
      expect(filtered.onlineCount).toBe(2);
      expect(filtered.totalCount).toBe(4); // Original total preserved
      expect(filtered.participants.every(p => p.isOnline)).toBe(true);
    });

    it('should handle empty participants array', () => {
      const emptyPresence = { ...mockChatPresence, participants: [] };
      const filtered = filterChatPresenceToOnlineOnly(emptyPresence);
      
      expect(filtered.participants).toHaveLength(0);
      expect(filtered.onlineCount).toBe(0);
    });
  });

  describe('shouldDisplayUser', () => {
    it('should return true for online users', () => {
      const onlineUser = { ...mockParticipants[0], isOnline: true };
      expect(shouldDisplayUser(onlineUser)).toBe(true);
    });

    it('should return false for offline users', () => {
      const offlineUser = { ...mockParticipants[1], isOnline: false };
      expect(shouldDisplayUser(offlineUser)).toBe(false);
    });
  });

  describe('getParticipantDisplayName', () => {
    it('should return display name when available', () => {
      const participant = { ...mockParticipants[0], displayName: 'John Doe' };
      expect(getParticipantDisplayName(participant)).toBe('John Doe');
    });

    it('should return userId when display name is not available', () => {
      const participant = { ...mockParticipants[0], displayName: undefined };
      expect(getParticipantDisplayName(participant)).toBe('user-1');
    });

    it('should return userId when display name is empty string', () => {
      const participant = { ...mockParticipants[0], displayName: '' };
      expect(getParticipantDisplayName(participant)).toBe('user-1');
    });
  });

  describe('sortParticipantsByPresence', () => {
    it('should sort online participants first', () => {
      const sorted = sortParticipantsByPresence(mockParticipants);
      
      expect(sorted[0].isOnline).toBe(true);
      expect(sorted[1].isOnline).toBe(true);
      expect(sorted[2].isOnline).toBe(false);
      expect(sorted[3].isOnline).toBe(false);
    });

    it('should sort by display name within same presence status', () => {
      const participants = [
        { ...mockParticipants[0], isOnline: true, displayName: 'Charlie' },
        { ...mockParticipants[1], isOnline: true, displayName: 'Alice' },
        { ...mockParticipants[2], isOnline: true, displayName: 'Bob' },
      ];
      
      const sorted = sortParticipantsByPresence(participants);
      
      expect(sorted[0].displayName).toBe('Alice');
      expect(sorted[1].displayName).toBe('Bob');
      expect(sorted[2].displayName).toBe('Charlie');
    });
  });

  describe('validatePresenceData', () => {
    it('should return true for valid presence data', () => {
      expect(validatePresenceData(mockChatPresence)).toBe(true);
    });

    it('should return false for null presence data', () => {
      expect(validatePresenceData(null)).toBe(false);
    });

    it('should return false for missing chatId', () => {
      const invalidPresence = { ...mockChatPresence, chatId: '' };
      expect(validatePresenceData(invalidPresence)).toBe(false);
    });

    it('should return false for invalid participants array', () => {
      const invalidPresence = { ...mockChatPresence, participants: null as any };
      expect(validatePresenceData(invalidPresence)).toBe(false);
    });

    it('should return false for participant missing userId', () => {
      const invalidParticipants = [{ ...mockParticipants[0], userId: '' }];
      const invalidPresence = { ...mockChatPresence, participants: invalidParticipants };
      expect(validatePresenceData(invalidPresence)).toBe(false);
    });

    it('should return false for participant missing isOnline', () => {
      const invalidParticipants = [{ ...mockParticipants[0], isOnline: undefined as any }];
      const invalidPresence = { ...mockChatPresence, participants: invalidParticipants };
      expect(validatePresenceData(invalidPresence)).toBe(false);
    });
  });

  describe('getPresenceSummary', () => {
    it('should return correct summary for valid presence data', () => {
      const summary = getPresenceSummary(mockChatPresence);
      expect(summary).toContain('chat-1');
      expect(summary).toContain('2 online');
      expect(summary).toContain('2 offline');
      expect(summary).toContain('4 total');
    });

    it('should return "No presence data" for null', () => {
      expect(getPresenceSummary(null)).toBe('No presence data');
    });
  });

  describe('hasPresenceChanged', () => {
    it('should return false when both presences are null', () => {
      expect(hasPresenceChanged(null, null)).toBe(false);
    });

    it('should return true when one presence is null and other is not', () => {
      expect(hasPresenceChanged(null, mockChatPresence)).toBe(true);
      expect(hasPresenceChanged(mockChatPresence, null)).toBe(true);
    });

    it('should return true when online count changes', () => {
      const changedPresence = { ...mockChatPresence, onlineCount: 3 };
      expect(hasPresenceChanged(mockChatPresence, changedPresence)).toBe(true);
    });

    it('should return true when participant count changes', () => {
      const changedPresence = { 
        ...mockChatPresence, 
        participants: mockParticipants.slice(0, 2) 
      };
      expect(hasPresenceChanged(mockChatPresence, changedPresence)).toBe(true);
    });

    it('should return true when participant online status changes', () => {
      const changedParticipants = mockParticipants.map(p => 
        p.userId === 'user-1' ? { ...p, isOnline: false } : p
      );
      const changedPresence = { ...mockChatPresence, participants: changedParticipants };
      expect(hasPresenceChanged(mockChatPresence, changedPresence)).toBe(true);
    });

    it('should return false when no changes detected', () => {
      expect(hasPresenceChanged(mockChatPresence, mockChatPresence)).toBe(false);
    });
  });
});
