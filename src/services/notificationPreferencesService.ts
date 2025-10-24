import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NotificationPreferences,
    NotificationPreferenceUpdate
} from '../types/notificationPreferences';

class NotificationPreferencesService {
  private preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
  private listeners: Set<(preferences: NotificationPreferences) => void> = new Set();

  /**
   * Load preferences from Firestore
   */
  async loadPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      console.log('🔔 NotificationPreferencesService: Loading preferences for user:', userId);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const savedPreferences = userData.notificationPreferences;
        
        if (savedPreferences) {
          // Merge with defaults to handle new fields
          this.preferences = {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...savedPreferences,
            lastUpdated: savedPreferences.lastUpdated?.toDate() || new Date(),
          };
          
          console.log('🔔 NotificationPreferencesService: Loaded preferences:', this.preferences);
        } else {
          console.log('🔔 NotificationPreferencesService: No saved preferences, using defaults');
        }
      } else {
        console.log('🔔 NotificationPreferencesService: User document not found, using defaults');
      }
      
      this.notifyListeners();
      return this.preferences;
      
    } catch (error) {
      console.error('🔔 NotificationPreferencesService: Error loading preferences:', error);
      return this.preferences;
    }
  }

  /**
   * Save preferences to Firestore
   */
  async savePreferences(userId: string, preferences: NotificationPreferences): Promise<boolean> {
    try {
      console.log('🔔 NotificationPreferencesService: Saving preferences for user:', userId);
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationPreferences: {
          ...preferences,
          lastUpdated: new Date(),
        }
      });
      
      this.preferences = preferences;
      this.notifyListeners();
      
      console.log('🔔 NotificationPreferencesService: Preferences saved successfully');
      return true;
      
    } catch (error) {
      console.error('🔔 NotificationPreferencesService: Error saving preferences:', error);
      return false;
    }
  }

  /**
   * Update specific preference fields
   */
  async updatePreferences(userId: string, updates: NotificationPreferenceUpdate): Promise<boolean> {
    try {
      console.log('🔔 NotificationPreferencesService: Updating preferences:', updates);
      
      const updatedPreferences: NotificationPreferences = {
        ...this.preferences,
        ...updates,
        quietHours: {
          ...this.preferences.quietHours,
          ...updates.quietHours,
        },
        keywords: {
          ...this.preferences.keywords,
          ...updates.keywords,
        },
        lastUpdated: new Date(),
      };
      
      return await this.savePreferences(userId, updatedPreferences);
      
    } catch (error) {
      console.error('🔔 NotificationPreferencesService: Error updating preferences:', error);
      return false;
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<boolean> {
    try {
      console.log('🔔 NotificationPreferencesService: Resetting preferences to defaults');
      
      const defaultPreferences: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        lastUpdated: new Date(),
      };
      
      return await this.savePreferences(userId, defaultPreferences);
      
    } catch (error) {
      console.error('🔔 NotificationPreferencesService: Error resetting preferences:', error);
      return false;
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if currently in quiet hours
   */
  isInQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) {
      return false;
    }

    try {
      const now = new Date();
      const timezone = this.preferences.quietHours.timezone;
      
      // Get current time in user's timezone
      const currentTime = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      
      const startTime = this.preferences.quietHours.startTime;
      const endTime = this.preferences.quietHours.endTime;
      
      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
      } else {
        return currentTime >= startTime && currentTime <= endTime;
      }
      
    } catch (error) {
      console.error('🔔 NotificationPreferencesService: Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Check if message should trigger notification based on preferences
   */
  shouldNotifyForMessage(messageText: string, chatType: 'direct' | 'group'): boolean {
    // Check if notifications are enabled
    if (!this.preferences.enabled) {
      return false;
    }

    // Check chat type preferences
    if (chatType === 'group' && !this.preferences.groupChatNotifications) {
      return false;
    }
    
    if (chatType === 'direct' && !this.preferences.directMessageNotifications) {
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours()) {
      // Check if keywords are enabled and message contains keyword
      if (this.preferences.keywords.enabled && this.preferences.keywords.keywords.length > 0) {
        const messageLower = messageText.toLowerCase();
        const hasKeyword = this.preferences.keywords.keywords.some(keyword => 
          messageLower.includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          console.log('🔔 NotificationPreferencesService: Message contains keyword, allowing notification');
          return true;
        }
      }
      
      console.log('🔔 NotificationPreferencesService: In quiet hours, suppressing notification');
      return false;
    }

    return true;
  }

  /**
   * Add listener for preference changes
   */
  addListener(listener: (preferences: NotificationPreferences) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener for preference changes
   */
  removeListener(listener: (preferences: NotificationPreferences) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of preference changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.preferences);
      } catch (error) {
        console.error('🔔 NotificationPreferencesService: Error in listener:', error);
      }
    });
  }

  /**
   * Clear all listeners (for cleanup)
   */
  clearListeners(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesService();
export default notificationPreferencesService;
