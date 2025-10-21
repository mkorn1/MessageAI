export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  chatId: string;
  
  // Additional properties for enhanced messaging
  messageType: MessageType;
  status: MessageStatus;
  replyTo?: string; // ID of message being replied to
  attachments?: MessageAttachment[];
  editedAt?: Date;
  deletedAt?: Date;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system' // For system messages like "User joined"
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string; // For images
}

// Helper type for creating new messages (without id, timestamp, status)
export type CreateMessage = Omit<Message, 'id' | 'timestamp' | 'status'> & {
  timestamp?: Date; // Optional for optimistic updates
  status?: MessageStatus; // Optional for optimistic updates
};

// Helper type for message updates
export type UpdateMessage = Partial<Pick<Message, 'text' | 'status' | 'editedAt' | 'deletedAt'>>;
