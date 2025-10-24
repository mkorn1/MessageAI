import { Message } from '../types';

/**
 * Utility functions for message deduplication
 */

export interface DeduplicationResult {
  messages: Message[];
  newMessages: Message[];
  replacedOptimisticMessages: number;
}

/**
 * Creates a unique key for message matching
 */
export const createMessageKey = (msg: Message): string => {
  // For optimistic messages, use content-based key
  if (msg.id.startsWith('temp_')) {
    return `temp_${msg.senderId}_${msg.text}_${msg.timestamp.getTime()}`;
  }
  // For real messages, use the actual ID
  return msg.id;
};

/**
 * Checks if two messages are duplicates
 */
export const areMessagesDuplicate = (msg1: Message, msg2: Message): boolean => {
  // Same ID = definitely duplicate
  if (msg1.id === msg2.id) return true;
  
  // Same content, sender, and timestamp (within 5 seconds) = likely duplicate
  const timeDiff = Math.abs(msg1.timestamp.getTime() - msg2.timestamp.getTime());
  return msg1.text === msg2.text && 
         msg1.senderId === msg2.senderId && 
         timeDiff < 5000; // 5 seconds tolerance
};

/**
 * Efficiently deduplicates messages using Map for O(1) lookups
 */
export const deduplicateMessages = (
  existingMessages: Message[],
  newMessages: Message[]
): DeduplicationResult => {
  const messageMap = new Map<string, Message>();
  let replacedOptimisticMessages = 0;
  
  // Add all existing messages first
  existingMessages.forEach(msg => {
    const key = createMessageKey(msg);
    messageMap.set(key, msg);
  });
  
  // Process new server messages
  newMessages.forEach(newMsg => {
    let isDuplicate = false;
    
    // Check against existing messages
    for (const [key, existingMsg] of messageMap.entries()) {
      if (areMessagesDuplicate(newMsg, existingMsg)) {
        // Server message takes priority over optimistic message
        if (existingMsg.id.startsWith('temp_') && !newMsg.id.startsWith('temp_')) {
          messageMap.set(key, newMsg);
          replacedOptimisticMessages++;
        }
        isDuplicate = true;
        break;
      }
    }
    
    // Only add if not a duplicate
    if (!isDuplicate) {
      const key = createMessageKey(newMsg);
      messageMap.set(key, newMsg);
    }
  });
  
  // Convert back to array and sort by timestamp
  const combinedMessages = Array.from(messageMap.values())
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Find truly new messages (not in original set)
  const existingMessageIds = new Set(existingMessages.map(msg => msg.id));
  const newMessagesOnly = combinedMessages.filter(msg => !existingMessageIds.has(msg.id));
  
  return {
    messages: combinedMessages,
    newMessages: newMessagesOnly,
    replacedOptimisticMessages
  };
};

/**
 * Filters messages that should be marked as read
 */
export const getMessagesToMarkAsRead = (
  messages: Message[],
  currentUserId: string,
  excludeOptimistic = true
): Message[] => {
  return messages.filter(msg => 
    msg.senderId !== currentUserId && 
    (!excludeOptimistic || !msg.id.startsWith('temp_')) &&
    (!msg.readBy || !msg.readBy[currentUserId])
  );
};

/**
 * Filters messages from other users (for notifications)
 */
export const getMessagesFromOthers = (
  messages: Message[],
  currentUserId: string,
  excludeOptimistic = true
): Message[] => {
  return messages.filter(msg => 
    msg.senderId !== currentUserId && 
    (!excludeOptimistic || !msg.id.startsWith('temp_'))
  );
};
