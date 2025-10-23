import { useCallback, useEffect, useRef, useState } from 'react';
import AuthService from '../services/auth';
import MessagingService from '../services/messaging';
import { AppError, Message, MessageType } from '../types';

interface UseMessagesOptions {
  chatId: string;
  enableRealTime?: boolean;
  batchSize?: number;
  onError?: (error: AppError) => void;
}

interface UseMessagesReturn {
  // Message data
  messages: Message[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  
  // Error states
  error: AppError | null;
  connectionError: boolean;
  
  // Actions
  sendMessage: (text: string, messageType?: MessageType) => Promise<void>;
  refreshMessages: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  retryFailedMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  
  // Utilities
  clearError: () => void;
  getMessageById: (messageId: string) => Message | undefined;
  getMessagesByStatus: (status: MessageStatus) => Message[];
}

export const useMessages = ({
  chatId,
  enableRealTime = true,
  batchSize = 50,
  onError
}: UseMessagesOptions): UseMessagesReturn => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  
  // Refs for tracking
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const currentUserRef = useRef(AuthService.getCurrentUser());
  
  // Initialize messages and real-time listener
  useEffect(() => {
    initializeMessages();
    
    // Update current user reference
    const unsubscribeAuth = AuthService.onAuthStateChanged((user) => {
      currentUserRef.current = user;
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeAuth();
    };
  }, [chatId, initializeMessages]);

  // Initialize messages and set up real-time listener
  const initializeMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionError(false);

      // Load initial messages
      const result = await MessagingService.getMessages(chatId, undefined, batchSize);
      
      if (result.success) {
        setMessages(result.data);
        if (result.data.length > 0) {
          lastMessageIdRef.current = result.data[0].id;
        }
        setHasMoreMessages(result.data.length === batchSize);
      } else {
        setError(result.error);
        onError?.(result.error);
      }

      // Set up real-time listener if enabled
      if (enableRealTime) {
        unsubscribeRef.current = MessagingService.subscribeToMessages(
          chatId,
          (newMessages) => {
            console.log('🔄 Real-time listener received messages:', newMessages.length);
            
            // Note: Read marking is handled by ChatScreen effects to avoid race conditions
            // The real-time listener should only handle message updates, not read marking
            
            // Merge with existing messages using enhanced deduplication
            setMessages(prevMessages => {
              // Create a comprehensive deduplication map
              const messageMap = new Map<string, Message>();
              
              // Helper function to create a unique key for message matching
              const createMessageKey = (msg: Message): string => {
                // For optimistic messages, use content-based key
                if (msg.id.startsWith('temp_')) {
                  return `temp_${msg.senderId}_${msg.text}_${msg.timestamp.getTime()}`;
                }
                // For real messages, use the actual ID
                return msg.id;
              };
              
              // Helper function to check if messages are duplicates
              const areMessagesDuplicate = (msg1: Message, msg2: Message): boolean => {
                // Same ID = definitely duplicate
                if (msg1.id === msg2.id) return true;
                
                // Same content, sender, and timestamp (within 5 seconds) = likely duplicate
                const timeDiff = Math.abs(msg1.timestamp.getTime() - msg2.timestamp.getTime());
                return msg1.text === msg2.text && 
                       msg1.senderId === msg2.senderId && 
                       timeDiff < 5000; // 5 seconds tolerance
              };
              
              // Add all existing messages first
              prevMessages.forEach(msg => {
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
                      console.log('🔄 Replaced optimistic message with server message:', existingMsg.id, '→', newMsg.id);
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
              
              console.log('📝 Deduplicated messages:', combinedMessages.length, 'server:', newMessages.length, 'previous:', prevMessages.length);
              return combinedMessages;
            });
            setConnectionError(false);
          },
          (error) => {
            console.error('Real-time listener error:', error);
            setConnectionError(true);
            setError({
              code: 'realtime-error',
              message: 'Connection lost. Messages may not update in real-time.',
              details: error
            });
          }
        );
      }

    } catch (err) {
      const error: AppError = {
        code: 'initialization-error',
        message: 'Failed to load messages',
        details: err
      };
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, enableRealTime, batchSize, onError]);

  // Send a message
  const sendMessage = useCallback(async (text: string, messageType: MessageType = MessageType.TEXT) => {
    const currentUser = currentUserRef.current;
    console.log('🔍 sendMessage called');
    
    if (!currentUser) {
      const error: AppError = {
        code: 'auth-error',
        message: 'You must be logged in to send messages'
      };
      console.log('❌ No current user found');
      setError(error);
      onError?.(error);
      return;
    }

    try {
      // Create optimistic message with a more unique ID
      const optimisticMessage: Message = {
        id: `temp_${currentUser.uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text,
        senderId: currentUser.uid,
        timestamp: new Date(),
        chatId,
        messageType,
      };

      console.log('📝 Adding optimistic message');
      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to server
      console.log('🚀 Sending message to server');
      const result = await MessagingService.sendMessage({
        text,
        senderId: currentUser.uid,
        chatId,
        messageType,
        timestamp: new Date(),
      });

      console.log('📡 Server response:', result);

      if (result.success) {
        // Replace optimistic message with real message from server
        console.log('✅ Message sent successfully, replacing optimistic message');
        console.log('🔄 Replacing message:', optimisticMessage.id, 'with server data:', result.data);
        setMessages(prev => {
          // Create a map for deduplication
          const messageMap = new Map<string, Message>();
          
          // Add all existing messages except the optimistic one
          prev.forEach(msg => {
            if (msg.id !== optimisticMessage.id) {
              messageMap.set(msg.id, msg);
            }
          });
          
          // Add the real message from server
          const realMessage = { 
            ...result.data, 
            timestamp: result.data.timestamp || new Date()
          };
          messageMap.set(realMessage.id, realMessage);
          
          // Convert back to array and sort by timestamp
          const newMessages = Array.from(messageMap.values())
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          console.log('📝 Updated messages count:', newMessages.length);
          return newMessages;
        });
        console.log('✅ Message added to messages list');
      } else {
        // Remove optimistic message and show error
        console.log('❌ Message send failed:', result.error);
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setError(result.error);
        onError?.(result.error);
      }

    } catch (err) {
      // Remove optimistic message
      console.log('💥 Exception during message send:', err);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      const error: AppError = {
        code: 'send-error',
        message: 'Failed to send message. Please try again.',
        details: err
      };
      setError(error);
      onError?.(error);
    }
  }, [chatId, onError]);

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    setIsRefreshing(true);
    await initializeMessages();
    setIsRefreshing(false);
  }, [initializeMessages]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      // Temporarily disable pagination to avoid index error
      const result = await MessagingService.getMessages(chatId, undefined, batchSize);
      
      if (result.success) {
        setMessages(prev => {
          // Create a map for deduplication
          const messageMap = new Map<string, Message>();
          
          // Add existing messages
          prev.forEach(msg => {
            messageMap.set(msg.id, msg);
          });
          
          // Add new messages (avoiding duplicates)
          result.data.forEach(newMsg => {
            if (!messageMap.has(newMsg.id)) {
              messageMap.set(newMsg.id, newMsg);
            }
          });
          
          // Convert back to array and sort by timestamp
          const combinedMessages = Array.from(messageMap.values())
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          return combinedMessages;
        });
        
        if (result.data.length > 0) {
          lastMessageIdRef.current = result.data[0].id;
        }
        setHasMoreMessages(result.data.length === batchSize);
      } else {
        setError(result.error);
        onError?.(result.error);
      }
    } catch (err) {
      const error: AppError = {
        code: 'load-more-error',
        message: 'Failed to load more messages',
        details: err
      };
      setError(error);
      onError?.(error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, hasMoreMessages, isLoadingMore, batchSize, onError]);

  // Retry failed message
  const retryFailedMessage = useCallback(async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;

    try {
      // Retry sending
      const result = await MessagingService.sendMessage({
        text: message.text,
        senderId: message.senderId,
        chatId: message.chatId,
        messageType: message.messageType,
        timestamp: new Date()
      });

      if (result.success) {
        // Replace the message with the new one
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...result.data, timestamp: result.data.timestamp || new Date() }
              : msg
          )
        );
      } else {
        setError(result.error);
        onError?.(result.error);
      }
    } catch (err) {
      const error: AppError = {
        code: 'retry-error',
        message: 'Failed to retry message',
        details: err
      };
      setError(error);
      onError?.(error);
    }
  }, [messages, onError]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    try {
      const result = await MessagingService.editMessage(messageId, newText);
      
      if (result.success) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, text: newText, editedAt: new Date() }
              : msg
          )
        );
      } else {
        setError(result.error);
        onError?.(result.error);
      }
    } catch (err) {
      const error: AppError = {
        code: 'edit-error',
        message: 'Failed to edit message',
        details: err
      };
      setError(error);
      onError?.(error);
    }
  }, [onError]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const result = await MessagingService.deleteMessage(messageId);
      
      if (result.success) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, deletedAt: new Date() }
              : msg
          )
        );
      } else {
        setError(result.error);
        onError?.(result.error);
      }
    } catch (err) {
      const error: AppError = {
        code: 'delete-error',
        message: 'Failed to delete message',
        details: err
      };
      setError(error);
      onError?.(error);
    }
  }, [onError]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get message by ID
  const getMessageById = useCallback((messageId: string): Message | undefined => {
    return messages.find(msg => msg.id === messageId);
  }, [messages]);

  // Get messages by status
  const getMessagesByStatus = useCallback((status: MessageStatus): Message[] => {
    return messages.filter(msg => msg.status === status);
  }, [messages]);

  return {
    // Message data
    messages,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMoreMessages,
    
    // Error states
    error,
    connectionError,
    
    // Actions
    sendMessage,
    refreshMessages,
    loadMoreMessages,
    retryFailedMessage,
    editMessage,
    deleteMessage,
    
    // Utilities
    clearError,
    getMessageById,
    getMessagesByStatus
  };
};

export default useMessages;
