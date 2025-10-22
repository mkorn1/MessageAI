export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  chatId: string;
  
  // Additional properties for enhanced messaging
  messageType: MessageType;
  replyTo?: string; // ID of message being replied to
  attachments?: MessageAttachment[];
  editedAt?: Date;
  deletedAt?: Date;
  readBy?: { [userId: string]: Date }; // Read receipts tracking
  deliveredAt?: Date; // When message was delivered to recipient's device
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system' // For system messages like "User joined"
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

// Helper type for creating new messages (without id, timestamp)
export type CreateMessage = Omit<Message, 'id' | 'timestamp'> & {
  timestamp?: Date; // Optional for optimistic updates
};

// Helper type for message updates
export type UpdateMessage = Partial<Pick<Message, 'text' | 'editedAt' | 'deletedAt'>>;
