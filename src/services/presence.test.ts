import presenceCache from '../presence';
import { ChatPresence, UserPresence } from '../types/presence';

describe('PresenceCache', () => {
  const mockPresenceData: ChatPresence = {
    chatId: 'chat-1',
    participants: [
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
    ],
    onlineCount: 1,
    totalCount: 2,
  };

  beforeEach(() => {
    presenceCache.clear();
  });

  describe('get and set', () => {
    it('should return null for non-existent chat', () => {
      expect(presenceCache.get('non-existent')).toBeNull();
    });

    it('should store and retrieve presence data', () => {
      presenceCache.set('chat-1', mockPresenceData);
      
      const retrieved = presenceCache.get('chat-1');
      expect(retrieved).toEqual(mockPresenceData);
    });

    it('should return null for expired data', () => {
      presenceCache.set('chat-1', mockPresenceData, 1); // 1ms TTL
      
      // Wait for expiration
      setTimeout(() => {
        expect(presenceCache.get('chat-1')).toBeNull();
      }, 10);
    });

    it('should use default TTL when not specified', () => {
      const beforeSet = Date.now();
      presenceCache.set('chat-1', mockPresenceData);
      
      const retrieved = presenceCache.get('chat-1');
      expect(retrieved).toEqual(mockPresenceData);
      
      // Should still be valid (default TTL is 30 seconds)
      const afterGet = Date.now();
      expect(afterGet - beforeSet).toBeLessThan(30000);
    });
  });

  describe('has', () => {
    it('should return false for non-existent chat', () => {
      expect(presenceCache.has('non-existent')).toBe(false);
    });

    it('should return true for existing valid data', () => {
      presenceCache.set('chat-1', mockPresenceData);
      expect(presenceCache.has('chat-1')).toBe(true);
    });

    it('should return false for expired data', () => {
      presenceCache.set('chat-1', mockPresenceData, 1); // 1ms TTL
      
      setTimeout(() => {
        expect(presenceCache.has('chat-1')).toBe(false);
      }, 10);
    });
  });

  describe('updateUser', () => {
    it('should return null for non-existent chat', () => {
      const updatedUser: UserPresence = {
        userId: 'user-1',
        isOnline: false,
        displayName: 'Updated User',
      };
      
      expect(presenceCache.updateUser('non-existent', 'user-1', updatedUser)).toBeNull();
    });

    it('should update existing user presence', () => {
      presenceCache.set('chat-1', mockPresenceData);
      
      const updatedUser: UserPresence = {
        userId: 'user-1',
        isOnline: false, // Changed from true to false
        displayName: 'Updated User One',
      };
      
      const result = presenceCache.updateUser('chat-1', 'user-1', updatedUser);
      
      expect(result).toBeTruthy();
      expect(result?.participants[0]).toEqual(updatedUser);
      expect(result?.onlineCount).toBe(0); // Should be 0 now
    });

    it('should add new user if not exists', () => {
      presenceCache.set('chat-1', mockPresenceData);
      
      const newUser: UserPresence = {
        userId: 'user-3',
        isOnline: true,
        displayName: 'New User',
      };
      
      const result = presenceCache.updateUser('chat-1', 'user-3', newUser);
      
      expect(result).toBeTruthy();
      expect(result?.participants).toHaveLength(3);
      expect(result?.onlineCount).toBe(2); // user-1 + new user-3
      expect(result?.totalCount).toBe(3);
    });

    it('should return null for expired cache entry', () => {
      presenceCache.set('chat-1', mockPresenceData, 1); // 1ms TTL
      
      setTimeout(() => {
        const updatedUser: UserPresence = {
          userId: 'user-1',
          isOnline: false,
          displayName: 'Updated User',
        };
        
        expect(presenceCache.updateUser('chat-1', 'user-1', updatedUser)).toBeNull();
      }, 10);
    });
  });

  describe('delete', () => {
    it('should remove cached data', () => {
      presenceCache.set('chat-1', mockPresenceData);
      expect(presenceCache.has('chat-1')).toBe(true);
      
      presenceCache.delete('chat-1');
      expect(presenceCache.has('chat-1')).toBe(false);
    });

    it('should handle deletion of non-existent chat gracefully', () => {
      expect(() => presenceCache.delete('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all cached data', () => {
      presenceCache.set('chat-1', mockPresenceData);
      presenceCache.set('chat-2', { ...mockPresenceData, chatId: 'chat-2' });
      
      expect(presenceCache.has('chat-1')).toBe(true);
      expect(presenceCache.has('chat-2')).toBe(true);
      
      presenceCache.clear();
      
      expect(presenceCache.has('chat-1')).toBe(false);
      expect(presenceCache.has('chat-2')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct cache statistics', () => {
      presenceCache.set('chat-1', mockPresenceData);
      presenceCache.set('chat-2', { ...mockPresenceData, chatId: 'chat-2' });
      
      const stats = presenceCache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.entries).toHaveLength(2);
      
      const chat1Entry = stats.entries.find(e => e.chatId === 'chat-1');
      expect(chat1Entry).toBeTruthy();
      expect(chat1Entry?.onlineCount).toBe(1);
      expect(chat1Entry?.age).toBeGreaterThanOrEqual(0);
    });

    it('should return empty stats for empty cache', () => {
      const stats = presenceCache.getStats();
      
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100);
      expect(stats.entries).toHaveLength(0);
    });
  });

  describe('setTTL', () => {
    it('should set custom TTL for existing chat', () => {
      presenceCache.set('chat-1', mockPresenceData);
      presenceCache.setTTL('chat-1', 1000); // 1 second
      
      // Should still be valid immediately
      expect(presenceCache.has('chat-1')).toBe(true);
      
      // Should expire after 1 second
      setTimeout(() => {
        expect(presenceCache.has('chat-1')).toBe(false);
      }, 1100);
    });

    it('should handle non-existent chat gracefully', () => {
      expect(() => presenceCache.setTTL('non-existent', 1000)).not.toThrow();
    });
  });

  describe('extendTTL', () => {
    it('should extend TTL for existing chat', () => {
      presenceCache.set('chat-1', mockPresenceData, 1000); // 1 second initial TTL
      presenceCache.extendTTL('chat-1', 2000); // Extend by 2 seconds
      
      // Should still be valid after original TTL would have expired
      setTimeout(() => {
        expect(presenceCache.has('chat-1')).toBe(true);
      }, 1100);
      
      // Should expire after extended TTL
      setTimeout(() => {
        expect(presenceCache.has('chat-1')).toBe(false);
      }, 3100);
    });

    it('should handle non-existent chat gracefully', () => {
      expect(() => presenceCache.extendTTL('non-existent', 1000)).not.toThrow();
    });
  });

  describe('cache size management', () => {
    it('should handle cache size limits', () => {
      // Fill cache beyond max size to test cleanup
      for (let i = 0; i < 150; i++) {
        presenceCache.set(`chat-${i}`, {
          ...mockPresenceData,
          chatId: `chat-${i}`,
        });
      }
      
      const stats = presenceCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(100);
    });
  });
});
