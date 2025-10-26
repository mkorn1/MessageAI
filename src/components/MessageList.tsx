import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMessageStatuses } from '../hooks/useMessageStatuses';
import { Message } from '../types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onMessagePress?: (message: Message) => void;
  onMessageLongPress?: (message: Message) => void;
  onRetryMessage?: (messageId: string) => void;
  hasMoreMessages?: boolean;
  totalParticipants?: number; // Add total participants for group chat read count
  isGroupChat?: boolean; // Add flag to indicate if this is a group chat
  scrollToMessageId?: string; // Message ID to scroll to when provided
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onLoadMore,
  onMessagePress,
  onMessageLongPress,
  onRetryMessage,
  hasMoreMessages = false,
  totalParticipants,
  isGroupChat,
  scrollToMessageId
}) => {
  const flatListRef = useRef<FlatList>(null);
  const isNearBottom = useRef(true);
  const hasInitialScrolled = useRef(false);
  const previousFirstMessageId = useRef<string | null>(null);
  
  // Get message IDs for status fetching - MEMOIZED to prevent re-subscriptions
  const messageIds = useMemo(() => messages.map(msg => msg.id), [messages]);
  const { getStatus } = useMessageStatuses(messageIds);

  // Reset initial scroll flag when messages change significantly (e.g., switching chats)
  useEffect(() => {
    // If messages array is completely different (different chat), reset the flag
    if (messages.length > 0) {
      const currentFirstMessageId = messages[0]?.id || null;
      // Only reset if we've already scrolled and the first message ID changed
      // This handles chat switching
      const shouldReset = hasInitialScrolled.current && previousFirstMessageId.current !== null && previousFirstMessageId.current !== currentFirstMessageId;
      if (shouldReset) {
        hasInitialScrolled.current = false;
      }
      previousFirstMessageId.current = currentFirstMessageId;
    }
  }, [messageIds]);

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current) {
      // Scroll to bottom after a brief delay to ensure FlatList is laid out
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        hasInitialScrolled.current = true;
      }, 300);
    }
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isNearBottom.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Scroll to specific message when scrollToMessageId is provided
  useEffect(() => {
    if (scrollToMessageId && messages.length > 0) {
      const messageIndex = messages.findIndex(msg => msg.id === scrollToMessageId);
      if (messageIndex !== -1) {
        console.log('🔗 MessageList: Scrolling to message:', scrollToMessageId, 'at index:', messageIndex);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ 
            index: messageIndex, 
            animated: true,
            viewPosition: 0.5 // Center the message in view
          });
        }, 500); // Delay to ensure messages are rendered
      } else {
        console.warn('🔗 MessageList: Message not found for scrollToMessageId:', scrollToMessageId);
      }
    }
  }, [scrollToMessageId, messages]);

  // Handle scroll events to track if user is near bottom
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    isNearBottom.current = isAtBottom;
  }, []);

  // Handle scroll to bottom
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    isNearBottom.current = true;
  }, []);

  // Render individual message
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    // Show timestamp if it's the first message of the day or if there's a significant time gap
    const showTimestamp = shouldShowTimestamp(item, previousMessage);
    
    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {formatDateHeader(item.timestamp)}
            </Text>
          </View>
        )}
        
        <MessageBubble
          message={item}
          isOwnMessage={isOwnMessage}
          showTimestamp={true} // Always show timestamps for debugging
          showStatus={isOwnMessage}
          onPress={() => onMessagePress?.(item)}
          onLongPress={() => onMessageLongPress?.(item)}
          onRetry={onRetryMessage}
          currentUserId={currentUserId}
          totalParticipants={totalParticipants}
          isGroupChat={isGroupChat}
          status={getStatus(item.id)}
        />
      </View>
    );
  }, [currentUserId, messages, onMessagePress, onMessageLongPress, onRetryMessage, getStatus, totalParticipants, isGroupChat]);

  // Render loading indicator at top
  const renderHeader = useCallback(() => {
    if (!isLoading) return null;
    
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }, [isLoading]);

  // Render footer with load more option
  const renderFooter = useCallback(() => {
    if (!hasMoreMessages) return null;
    
    return (
      <View style={styles.footerContainer}>
        <Text style={styles.loadMoreText}>Load more messages</Text>
      </View>
    );
  }, [hasMoreMessages]);

  // Empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>Start the conversation!</Text>
      </View>
    );
  }, [isLoading]);

  // Key extractor for FlatList - ensures truly unique keys
  const keyExtractor = useCallback((item: Message) => {
    // For optimistic messages, create a more unique key
    if (item.id.startsWith('temp_')) {
      return `${item.id}_${item.senderId}_${item.timestamp.getTime()}`;
    }
    // For real messages, use the ID as-is
    return item.id;
  }, []);

  // Handle end reached for pagination
  const handleEndReached = useCallback(() => {
    if (hasMoreMessages && !isLoading) {
      onLoadMore?.();
    }
  }, [hasMoreMessages, isLoading, onLoadMore]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        onScroll={handleScroll}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          ) : undefined
        }
        style={styles.list}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10
        }}
      />
      
      {/* Scroll to bottom button */}
      {messages.length > 10 && !isNearBottom.current && (
        <View style={styles.scrollToBottomContainer}>
          <Text style={styles.scrollToBottomText} onPress={scrollToBottom}>
            ↓
          </Text>
        </View>
      )}
    </View>
  );
};

// Helper functions
const shouldShowTimestamp = (currentMessage: Message, previousMessage: Message | null): boolean => {
  if (!previousMessage) return true;
  
  const currentTime = new Date(currentMessage.timestamp);
  const previousTime = new Date(previousMessage.timestamp);
  const timeDiff = currentTime.getTime() - previousTime.getTime();
  const thirtySeconds = 30 * 1000; // 30 seconds in milliseconds
  
  return timeDiff > thirtySeconds;
};

const formatDateHeader = (timestamp: Date): string => {
  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isSameDay(messageDate, today)) {
    return 'Today';
  } else if (isSameDay(messageDate, yesterday)) {
    return 'Yesterday';
  } else {
    const diffInDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'long' });
    } else if (diffInDays < 365) {
      return messageDate.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    } else {
      return messageDate.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 4,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 0.5,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
    marginHorizontal: 16,
  },
  dateText: {
    fontSize: 11,
    color: '#8E8E93',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreText: {
    fontSize: 13,
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 20,
  },
  scrollToBottomContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  scrollToBottomText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MessageList;
