import { useCallback, useEffect, useRef, useState } from 'react';
import AuthService from '../services/auth';
import messageNotificationService from '../services/messageNotificationService';
import MessagingService from '../services/messaging';
import n8nMessageAnalysisService from '../services/n8nMessageAnalysisService';
import n8nWebhookService from '../services/n8nWebhookService';
import notificationService from '../services/notificationService';
import { AppError, Message, MessageType } from '../types';
import { MessageStatusType } from '../types/messageStatus';
import {
  deduplicateMessages,
  getMessagesFromOthers,
  getMessagesToMarkAsRead
} from '../utils/messageDeduplication';

// EMERGENCY FIX: Add console throttling to prevent spam
let messageLogCount = 0;
const throttledMessageLog = (message: string) => {
  messageLogCount++;
  if (messageLogCount % 20 === 0) { // Only log every 20th occurrence
    console.log(message);
  }
};

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
  markMessagesAsRead: (messageIds: string[]) => Promise<void>;
  
  // Utilities
  clearError: () => void;
  getMessageById: (messageId: string) => Message | undefined;
  getMessagesByStatus: (status: MessageStatusType) => Message[];
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
  const lastReadMarkTime = useRef<number>(0);
  const READ_MARK_THROTTLE = 1000; // 1 second throttle for real-time read marking
  
  // AI Analysis tracking
  const analyzedMessagesRef = useRef<Set<string>>(new Set());
  const aiAnalysisTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  
  // Trigger AI analysis for a message
  const triggerAIAnalysis = useCallback(async (message: Message, chatContext: Message[], userId: string) => {
    // Skip if already analyzed
    if (analyzedMessagesRef.current.has(message.id)) {
      return;
    }
    
    // Skip very short messages
    if (message.text.trim().length < 10) {
      return;
    }
    
    // Skip system messages or non-text messages
    if (message.messageType !== 'text') {
      return;
    }
    
    // Skip if analysis is already in progress (debounce)
    if (aiAnalysisTimeoutRef.current.has(message.id)) {
      return;
    }
    
    try {
      console.log('🤖 Triggering AI analysis for message:', message.id);
      analyzedMessagesRef.current.add(message.id);
      
      // Set a timeout to prevent rapid re-analysis
      const timeout = setTimeout(() => {
        aiAnalysisTimeoutRef.current.delete(message.id);
      }, 5000); // 5 second cooldown
      aiAnalysisTimeoutRef.current.set(message.id, timeout);
      
      // Send to n8n webhook for analysis
      const result = await n8nWebhookService.sendMessageAnalysis(message, chatContext, userId);
      
      if (result.success && result.data) {
        console.log('✅ AI analysis completed for message:', message.id);
        console.log('📊 Analysis response items:', result.data.length);
        
        // TEMPORARY: Log the full webhook response for debugging
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🔍 WEBHOOK RESPONSE LOG (TEMPORARY)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📝 Message ID:', message.id);
        console.log('💬 Message Text:', message.text);
        console.log('👤 Sender ID:', message.senderId);
        console.log('📊 Response Items Count:', result.data.length);
        console.log('───────────────────────────────────────────────────────────');
        console.log('📦 Full Webhook Response:');
        console.log(JSON.stringify(result.data, null, 2));
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Store the analysis response in Firestore
        const storeResult = await n8nMessageAnalysisService.storeAnalysis({
          messageId: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          analysisResponse: result.data,
          chatContext: chatContext,
          processed: false
        });
        
        if (storeResult.success) {
          console.log('✅ Analysis stored in n8n_message_analysis:', storeResult.data?.id);
        } else {
          console.error('⚠️ Failed to store analysis:', storeResult.error?.message);
        }
      } else {
        console.log('⚠️ AI analysis failed for message:', message.id, result.error?.message);
        // Remove from analyzed set so it can be retried
        analyzedMessagesRef.current.delete(message.id);
      }
    } catch (error) {
      console.error('❌ AI analysis error for message:', message.id, error);
      // Remove from analyzed set so it can be retried
      analyzedMessagesRef.current.delete(message.id);
    }
  }, []);
  
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
            throttledMessageLog('🔄 Real-time listener received messages: ' + newMessages.length);
            
            // Mark new messages as read when received (for messages not sent by current user)
            const currentUser = currentUserRef.current;
            const now = Date.now();
            
            // Throttle read marking to prevent excessive calls
            const shouldMarkAsRead = currentUser && (now - lastReadMarkTime.current > READ_MARK_THROTTLE);
            
            // Merge with existing messages using optimized deduplication
            setMessages(prevMessages => {
              const result = deduplicateMessages(prevMessages, newMessages);
              
              // Handle read marking for truly new messages
              if (shouldMarkAsRead) {
                const messagesToMark = getMessagesToMarkAsRead(result.newMessages, currentUser.uid);
                
                if (messagesToMark.length > 0) {
                  // Mark as read immediately for new messages
                  MessagingService.markMessagesAsRead(chatId, currentUser.uid, messagesToMark.map(msg => msg.id));
                  lastReadMarkTime.current = now;
                  
                  // Trigger notification badge update (non-blocking)
                  notificationService.clearBadgeCount().catch(() => {
                    // Silent fail for non-critical notification badge clear
                  });
                }
              }
              
              // Trigger notification checks for new messages from other users
              const newMessagesFromOthers = currentUser ? getMessagesFromOthers(result.newMessages, currentUser.uid) : [];
              
              if (newMessagesFromOthers.length > 0 && currentUser) {
                // Process notifications for new messages
                newMessagesFromOthers.forEach(message => {
                  // Create notification in storage for notification center
                  messageNotificationService.processNewMessage(
                    message,
                    currentUser.uid,
                    chatId
                  ).catch(() => {
                    // Silent fail for non-critical notification processing
                  });

                  // Trigger existing notification checks for push notifications
                  notificationService.checkAndSendNotification({
                    chatId: message.chatId,
                    messageId: message.id,
                    senderId: message.senderId,
                    messageText: message.text,
                    timestamp: message.timestamp,
                    chatType: 'direct' // Default to direct, will be overridden by MessagingService
                  }).catch(() => {
                    // Silent fail for non-critical notification check
                  });

                  // Trigger AI analysis for new messages (non-blocking)
                  // Only analyze truly new messages, not updated ones
                  // TEMPORARILY DISABLED to prevent infinite loop - re-enable after testing
                  if (result.newMessages.includes(message)) {
                    triggerAIAnalysis(message, result.messages, currentUser.uid).catch(() => {
                      // Silent fail for non-critical AI analysis
                    });
                  }
                });
              }
              
              return result.messages;
            });
            setConnectionError(false);
          },
          (error) => {
            setConnectionError(true);
            setError({
              code: 'realtime-error',
              message: 'Connection lost. Messages may not update in real-time.',
              details: error,
              timestamp: new Date()
            });
          }
        );
      }

    } catch (err) {
      const error: AppError = {
        code: 'initialization-error',
        message: 'Failed to load messages',
        details: err,
        timestamp: new Date()
      };
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, enableRealTime, batchSize, onError, triggerAIAnalysis]);

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
      
      // Cleanup AI analysis timeouts
      aiAnalysisTimeoutRef.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      aiAnalysisTimeoutRef.current.clear();
    };
  }, [chatId, initializeMessages]);

  // Send a message
  const sendMessage = useCallback(async (text: string, messageType: MessageType = MessageType.TEXT) => {
    const currentUser = currentUserRef.current;
    console.log('🔍 sendMessage called');
    
    if (!currentUser) {
      const error: AppError = {
        code: 'auth-error',
        message: 'You must be logged in to send messages',
        timestamp: new Date()
      };
      console.log('❌ No current user found');
      setError(error);
      onError?.(error);
      return;
    }

    let optimisticMessage: Message | null = null;

    try {
      // Create optimistic message with a more unique ID
      optimisticMessage = {
        id: `temp_${currentUser.uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text,
        senderId: currentUser.uid,
        timestamp: new Date(),
        chatId,
        messageType,
      };

      console.log('📝 Adding optimistic message');
      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage!]);

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
        console.log('🔄 Replacing message:', optimisticMessage?.id, 'with server data:', result.data);
        
        // Update messages state and trigger AI analysis
        setMessages(prev => {
          // Create a map for deduplication
          const messageMap = new Map<string, Message>();
          
          // Add all existing messages except the optimistic one
          prev.forEach(msg => {
            if (optimisticMessage && msg.id !== optimisticMessage.id) {
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
          
          // Trigger AI analysis for the sent message (non-blocking)
          const contextMessages = newMessages.slice(-50); // Get last 50 messages
          triggerAIAnalysis(realMessage, contextMessages, currentUser.uid).catch(error => {
            console.log('⚠️ AI analysis failed (non-critical):', error);
          });
          
          return newMessages;
        });
        console.log('✅ Message added to messages list');
        
        // Trigger notification checks for other participants (non-blocking)
        notificationService.checkAndSendNotification({
          chatId: result.data.chatId,
          messageId: result.data.id,
          senderId: result.data.senderId,
          messageText: result.data.text,
          timestamp: result.data.timestamp,
          chatType: 'direct' // Default to direct, will be overridden by MessagingService
        }).catch(error => {
          console.log('⚠️ Notification check failed (non-critical):', error);
        });
      } else {
        // Remove optimistic message and show error
        console.log('❌ Message send failed:', result.error);
        if (optimisticMessage) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage!.id));
        }
        setError(result.error);
        onError?.(result.error);
      }

    } catch (err) {
      // Remove optimistic message
      console.log('💥 Exception during message send:', err);
      if (optimisticMessage) {
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage!.id));
      }
      const error: AppError = {
        code: 'send-error',
        message: 'Failed to send message. Please try again.',
        details: err,
        timestamp: new Date()
      };
      setError(error);
      onError?.(error);
    }
  }, [chatId, onError, triggerAIAnalysis]);

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
        details: err,
        timestamp: new Date()
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
        details: err,
        timestamp: new Date()
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
        details: err,
        timestamp: new Date()
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
        details: err,
        timestamp: new Date()
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

  // Get messages by status (this would need to be implemented with the message status service)
  const getMessagesByStatus = useCallback((status: MessageStatusType): Message[] => {
    // Note: This would require integration with messageStatusService to get status information
    // For now, return empty array as status is tracked separately
    console.log('getMessagesByStatus called with status:', status);
    return [];
  }, []);

  // Mark messages as read and trigger notification updates
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    const currentUser = currentUserRef.current;
    if (!currentUser || !messageIds.length) return;

    try {
      const result = await MessagingService.markMessagesAsRead(chatId, currentUser.uid, messageIds);
      
      if (result.success) {
        console.log('📖 useMessages: Marked messages as read:', messageIds.length);
        
        // Trigger notification badge update (non-blocking)
        notificationService.clearBadgeCount().catch(error => {
          console.log('⚠️ Notification badge clear failed (non-critical):', error);
        });
      } else {
        console.error('❌ Failed to mark messages as read:', result.error);
      }
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }, [chatId]);

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
    markMessagesAsRead,
    
    // Utilities
    clearError,
    getMessageById,
    getMessagesByStatus
  };
};

export default useMessages;
