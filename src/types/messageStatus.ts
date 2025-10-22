export interface MessageStatus {
  id: string;
  messageId: string;
  status: MessageStatusType;
  timestamp: Date;
  userId?: string; // For read receipts
}

export enum MessageStatusType {
  SENDING = 'sending',
  SENT = 'sent',
  READ = 'read',
  FAILED = 'failed'
}

export interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatusType;
  userId?: string;
}
