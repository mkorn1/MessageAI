export interface NotificationPreferences {
  enabled: boolean;
  foregroundOnly: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
  groupChatNotifications: boolean;
  directMessageNotifications: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // Format: "HH:MM" (24-hour)
    endTime: string;   // Format: "HH:MM" (24-hour)
    timezone: string;   // User's timezone
  };
  keywords: {
    enabled: boolean;
    keywords: string[]; // Keywords that trigger notifications even in quiet hours
  };
  lastUpdated: Date;
}

export interface NotificationPreferenceUpdate {
  enabled?: boolean;
  foregroundOnly?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  badgeEnabled?: boolean;
  groupChatNotifications?: boolean;
  directMessageNotifications?: boolean;
  quietHours?: Partial<NotificationPreferences['quietHours']>;
  keywords?: Partial<NotificationPreferences['keywords']>;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  foregroundOnly: true,
  soundEnabled: true,
  vibrationEnabled: true,
  badgeEnabled: true,
  groupChatNotifications: true,
  directMessageNotifications: true,
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  keywords: {
    enabled: false,
    keywords: [],
  },
  lastUpdated: new Date(),
};

export interface NotificationPreferenceContextType {
  preferences: NotificationPreferences;
  isLoading: boolean;
  updatePreferences: (updates: NotificationPreferenceUpdate) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  isInQuietHours: () => boolean;
  shouldNotifyForMessage: (messageText: string, chatType: 'direct' | 'group') => boolean;
}
