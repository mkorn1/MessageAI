import { useCallback, useEffect, useRef, useState } from 'react';
import AuthService from '../services/auth';
import MessagingService from '../services/messaging';
import { AppError, Message, MessageStatus, MessageType } from '../types';

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
  }, [chatId]);

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
            // Merge with existing optimistic messages
            setMessages(prevMessages => {
              // Keep optimistic messages that aren't in the server response yet
              const optimisticMessages = prevMessages.filter(msg => msg.id.startsWith('temp_'));
              const serverMessages = newMessages;
              
              // Create a map to avoid duplicates
              const messageMap = new Map();
              
              // Add server messages first (they take priority)
              serverMessages.forEach(msg => {
                messageMap.set(msg.id, msg);
              });
              
              // Add optimistic messages only if they don't exist in server messages
              optimisticMessages.forEach(msg => {
                if (!messageMap.has(msg.id)) {
                  messageMap.set(msg.id, msg);
                }
              });
              
              // Convert back to array and sort by timestamp
              const combinedMessages = Array.from(messageMap.values())
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
              
              console.log('📝 Combined messages:', combinedMessages.length, 'server:', serverMessages.length, 'optimistic:', optimisticMessages.length);
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
    console.log('🔍 sendMessage called with:', { text, messageType, currentUser });
    
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
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        text,
        senderId: currentUser.uid,
        timestamp: new Date(),
        chatId,
        messageType,
        status: MessageStatus.SENDING
      };

      console.log('📝 Adding optimistic message:', optimisticMessage);
      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to server
      console.log('🚀 Sending message to server...');
      const result = await MessagingService.sendMessage({
        text,
        senderId: currentUser.uid,
        chatId,
        messageType,
        timestamp: new Date(),
        status: MessageStatus.SENDING
      });

      console.log('📡 Server response:', result);

      if (result.success) {
        // Update message with server response
        console.log('✅ Message sent successfully, updating UI');
        console.log('🔄 Updating message:', optimisticMessage.id, 'with server data:', result.data);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...result.data, status: MessageStatus.SENT }
              : msg
          )
        );
        console.log('✅ Message status updated to SENT');
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
        setMessages(prev => [...result.data, ...prev]);
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
    if (!message || message.status !== MessageStatus.FAILED) return;

    try {
      // Update message status to sending
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: MessageStatus.SENDING }
            : msg
        )
      );

      // Retry sending
      const result = await MessagingService.sendMessage({
        text: message.text,
        senderId: message.senderId,
        chatId: message.chatId,
        messageType: message.messageType,
        timestamp: message.timestamp,
        status: MessageStatus.SENDING
      });

      if (result.success) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...result.data, status: MessageStatus.SENT }
              : msg
          )
        );
      } else {
        // Mark as failed again
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, status: MessageStatus.FAILED }
              : msg
          )
        );
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
