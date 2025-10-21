export interface User {
  uid: string;
  email?: string | null;
  phoneNumber?: string | null;
  displayName?: string;
  photoURL?: string;
  
  // Additional user profile data
  firstName?: string;
  lastName?: string;
  bio?: string;
  status?: UserStatus;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Privacy settings
  isOnline: boolean;
  showOnlineStatus: boolean;
  allowMessagesFrom: 'everyone' | 'contacts' | 'none';
  
  // Notification preferences
  pushNotifications: boolean;
  emailNotifications: boolean;
  
  // Chat preferences
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
  INVISIBLE = 'invisible'
}

// Helper type for creating new users (without auto-generated fields)
export type CreateUser = Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'lastSeen'> & {
  createdAt?: Date;
  updatedAt?: Date;
  lastSeen?: Date;
};

// Helper type for updating user profile
export type UpdateUser = Partial<Pick<User, 
  'displayName' | 'firstName' | 'lastName' | 'bio' | 'photoURL' | 
  'status' | 'showOnlineStatus' | 'allowMessagesFrom' | 
  'pushNotifications' | 'emailNotifications' | 'theme' | 'language'
>>;

// Helper type for user presence updates
export type UpdateUserPresence = Pick<User, 'isOnline' | 'status' | 'lastSeen'>;

// Contact/friend relationship
export interface Contact {
  userId: string;
  contactId: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ContactStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
  DECLINED = 'declined'
}
