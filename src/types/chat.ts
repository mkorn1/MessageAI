export interface Chat {
  id: string;
  type: ChatType;
  name?: string; // For group chats
  description?: string; // For group chats
  participants: string[]; // Array of user IDs
  createdBy: string; // User ID who created the chat
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
  };
  
  // Group chat specific properties
  admins?: string[]; // Array of admin user IDs
  isPublic?: boolean; // Whether group is discoverable
  inviteCode?: string; // For joining group via code
  
  // Chat settings
  allowMemberInvites: boolean;
  allowMemberMessages: boolean;
  allowFileSharing: boolean;
  
  // Privacy settings
  isArchived: boolean;
  isMuted: boolean;
  notificationSettings: ChatNotificationSettings;
}

export enum ChatType {
  DIRECT = 'direct', // One-on-one chat
  GROUP = 'group',   // Group chat
  CHANNEL = 'channel' // Broadcast channel (future feature)
}

export interface ChatNotificationSettings {
  muteUntil?: Date;
  showPreviews: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// Helper type for creating new chats
export type CreateChat = Omit<Chat, 'id' | 'createdAt' | 'updatedAt' | 'lastMessage'> & {
  createdAt?: Date;
  updatedAt?: Date;
  lastMessage?: Chat['lastMessage'];
};

// Helper type for updating chat settings
export type UpdateChat = Partial<Pick<Chat, 
  'name' | 'description' | 'admins' | 'isPublic' | 'inviteCode' |
  'allowMemberInvites' | 'allowMemberMessages' | 'allowFileSharing' |
  'isArchived' | 'isMuted' | 'notificationSettings'
>>;

// Helper type for adding/removing participants
export type UpdateChatParticipants = {
  action: 'add' | 'remove';
  userIds: string[];
};

// Chat member with additional metadata
export interface ChatMember {
  userId: string;
  chatId: string;
  role: ChatMemberRole;
  joinedAt: Date;
  lastReadAt?: Date;
  isActive: boolean;
}

export enum ChatMemberRole {
  MEMBER = 'member',
  ADMIN = 'admin',
  OWNER = 'owner'
}

// Chat invitation
export interface ChatInvitation {
  id: string;
  chatId: string;
  invitedBy: string; // User ID who sent the invitation
  invitedUser: string; // User ID who was invited
  status: InvitationStatus;
  createdAt: Date;
  expiresAt?: Date;
  message?: string; // Optional invitation message
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired'
}
