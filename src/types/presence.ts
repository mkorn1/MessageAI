/**
 * TypeScript interfaces and types for presence indicator components
 */

// Base presence dot component props
export interface PresenceDotProps {
  /** Size of the dot in pixels (default: 8) */
  size?: number;
  /** Color of the dot (default: '#00C851' - green) */
  color?: string;
  /** Test ID for testing purposes */
  testID?: string;
}

// Presence summary component props for overflow display
export interface PresenceSummaryProps {
  /** Number of additional participants to show in summary (e.g., +4) */
  count: number;
  /** Size of the dot in pixels (default: 8) */
  dotSize?: number;
  /** Font size for the count text (default: 12) */
  textSize?: number;
  /** Color for both dot and text (default: '#00C851' - green) */
  color?: string;
  /** Test ID for testing purposes */
  testID?: string;
}

// Main presence indicator component props
export interface PresenceIndicatorProps {
  /** Number of online participants to display */
  onlineCount: number;
  /** Maximum number of individual dots to show before switching to summary (default: 5) */
  maxIndividualDots?: number;
  /** Size of individual dots in pixels (default: 8) */
  dotSize?: number;
  /** Spacing between individual dots in pixels (default: 4) */
  spacing?: number;
  /** Test ID for testing purposes */
  testID?: string;
}

// User presence data structure
export interface UserPresence {
  /** User ID */
  userId: string;
  /** Whether the user is currently online */
  isOnline: boolean;
  /** Last seen timestamp */
  lastSeen?: Date;
  /** User's display name */
  displayName?: string;
}

// Chat presence data structure
export interface ChatPresence {
  /** Chat ID */
  chatId: string;
  /** List of participants with their presence status */
  participants: UserPresence[];
  /** Count of online participants */
  onlineCount: number;
  /** Count of total participants */
  totalCount: number;
}

// Presence hook return type
export interface UsePresenceReturn {
  /** Current presence data for the chat */
  presence: ChatPresence | null;
  /** Whether presence data is currently loading */
  isLoading: boolean;
  /** Any error that occurred while fetching presence data */
  error: Error | null;
  /** Function to refresh presence data */
  refresh: () => void;
}

// Presence service configuration
export interface PresenceConfig {
  /** Timeout in seconds before marking user as offline after app closure (default: 30-45) */
  offlineTimeoutSeconds: number;
  /** Interval in seconds for presence updates (default: 5) */
  updateIntervalSeconds: number;
  /** Whether to enable presence caching (default: true) */
  enableCaching: boolean;
}

// Presence update event types
export type PresenceEventType = 'online' | 'offline' | 'timeout';

export interface PresenceEvent {
  /** Type of presence event */
  type: PresenceEventType;
  /** User ID affected by the event */
  userId: string;
  /** Timestamp of the event */
  timestamp: Date;
  /** Additional event data */
  data?: Record<string, any>;
}
