import { ChatPresence, UserPresence } from '../types/presence';

/**
 * Presence cache service for performance optimization
 * Reduces Firestore reads and provides faster data access
 */

interface CacheEntry {
  data: ChatPresence;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class PresenceCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds default TTL
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached chats

  /**
   * Get cached presence data for a chat
   * @param chatId Chat ID to look up
   * @returns Cached presence data or null if not found/expired
   */
  get(chatId: string): ChatPresence | null {
    const entry = this.cache.get(chatId);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(chatId);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached presence data for a chat
   * @param chatId Chat ID
   * @param presenceData Presence data to cache
   * @param ttl Optional TTL override (default: 30 seconds)
   */
  set(chatId: string, presenceData: ChatPresence, ttl?: number): void {
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup();
    }

    const entry: CacheEntry = {
      data: presenceData,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };

    this.cache.set(chatId, entry);
  }

  /**
   * Update cached presence data for a specific user in a chat
   * @param chatId Chat ID
   * @param userId User ID to update
   * @param userPresence Updated user presence data
   * @returns Updated presence data or null if chat not cached
   */
  updateUser(chatId: string, userId: string, userPresence: UserPresence): ChatPresence | null {
    const entry = this.cache.get(chatId);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(chatId);
      return null;
    }

    // Update the specific user's presence data
    const updatedParticipants = entry.data.participants.map(participant => 
      participant.userId === userId ? userPresence : participant
    );

    // Recalculate online count
    const onlineCount = updatedParticipants.filter(p => p.isOnline).length;

    const updatedPresence: ChatPresence = {
      ...entry.data,
      participants: updatedParticipants,
      onlineCount,
    };

    // Update cache with new data
    entry.data = updatedPresence;
    entry.timestamp = Date.now();

    return updatedPresence;
  }

  /**
   * Check if presence data is cached and not expired
   * @param chatId Chat ID to check
   * @returns True if valid cached data exists
   */
  has(chatId: string): boolean {
    const entry = this.cache.get(chatId);
    
    if (!entry) {
      return false;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(chatId);
      return false;
    }

    return true;
  }

  /**
   * Remove cached data for a specific chat
   * @param chatId Chat ID to remove from cache
   */
  delete(chatId: string): void {
    this.cache.delete(chatId);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   * @returns Cache statistics object
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{
      chatId: string;
      age: number;
      ttl: number;
      onlineCount: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([chatId, entry]) => ({
      chatId,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      onlineCount: entry.data.onlineCount,
    }));

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries,
    };
  }

  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [chatId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(chatId);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Set custom TTL for a specific chat
   * @param chatId Chat ID
   * @param ttl Time to live in milliseconds
   */
  setTTL(chatId: string, ttl: number): void {
    const entry = this.cache.get(chatId);
    if (entry) {
      entry.ttl = ttl;
    }
  }

  /**
   * Extend TTL for a specific chat (useful for active chats)
   * @param chatId Chat ID
   * @param extensionMs Additional time in milliseconds
   */
  extendTTL(chatId: string, extensionMs: number): void {
    const entry = this.cache.get(chatId);
    if (entry) {
      entry.ttl += extensionMs;
    }
  }
}

// Export singleton instance
export const presenceCache = new PresenceCache();
export default presenceCache;
