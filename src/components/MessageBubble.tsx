import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Message, MessageType } from '../types';
import { MessageStatusType } from '../types/messageStatus';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showTimestamp?: boolean;
  showStatus?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  showDetailedTimestamp?: boolean;
  onRetry?: (messageId: string) => void;
  currentUserId?: string; // Add current user ID for read status calculation
  totalParticipants?: number; // Add total participants for group chat read count
  isGroupChat?: boolean; // Add flag to indicate if this is a group chat
  status?: MessageStatusType; // Add status prop
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  showTimestamp = true,
  showStatus = true,
  onPress,
  onLongPress,
  showDetailedTimestamp = false,
  onRetry,
  currentUserId,
  totalParticipants,
  isGroupChat,
  status = MessageStatusType.SENDING
}) => {
  // Determine the effective status based on message data and readBy field
  const getEffectiveStatus = (): MessageStatusType => {
    // For own messages, prioritize the status prop from useMessageStatuses hook
    if (isOwnMessage) {
      // If we have a status from the message status service, use it
      if (status && status !== MessageStatusType.SENDING) {
        return status;
      }
      
      // Fallback to readBy field for backward compatibility
      if (currentUserId) {
        const readByOthers = message.readBy && Object.keys(message.readBy).some(userId => userId !== currentUserId);
        if (readByOthers) {
          return MessageStatusType.READ;
        }
        return MessageStatusType.SENT;
      }
      
      return MessageStatusType.SENT;
    }
    
    // For messages from others, use the provided status
    return status;
  };

  const effectiveStatus = getEffectiveStatus();

  // Calculate read count for group chats
  const getReadCount = (): string | null => {
    if (!isGroupChat || !isOwnMessage || !message.readBy || !totalParticipants) {
      return null;
    }

    // Count readers excluding the sender
    const readers = Object.keys(message.readBy).filter(userId => userId !== currentUserId);
    const readCount = readers.length;
    const totalCount = totalParticipants - 1; // Exclude sender

    if (totalCount <= 1) {
      return null; // Don't show read count for 1-on-1 chats
    }

    return `Read by ${readCount} of ${totalCount}`;
  };

  const readCountText = getReadCount();

  const formatTime = (timestamp: Date): string => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    // Same day - show time only
    if (diffInDays === 0) {
      return messageTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // Yesterday
    if (diffInDays === 1) {
      return 'Yesterday';
    }
    
    // Within a week - show day name
    if (diffInDays < 7) {
      return messageTime.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Within a year - show month and day
    if (diffInDays < 365) {
      return messageTime.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // More than a year - show full date
    return messageTime.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDetailedTime = (timestamp: Date): string => {
    const messageTime = new Date(timestamp);
    return messageTime.toLocaleString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusIcon = (status: MessageStatusType): string => {
    switch (status) {
      case MessageStatusType.SENDING:
        return '⏳';
      case MessageStatusType.SENT:
        return '✓';
      case MessageStatusType.READ:
        return '✓✓';
      case MessageStatusType.FAILED:
        return '⚠️';
      default:
        return '';
    }
  };

  const getStatusColor = (status: MessageStatusType): string => {
    switch (status) {
      case MessageStatusType.SENDING:
        return '#999';
      case MessageStatusType.SENT:
        return '#999';
      case MessageStatusType.READ:
        return '#007AFF';
      case MessageStatusType.FAILED:
        return '#FF3B30';
      default:
        return '#999';
    }
  };

  const getMessageTypeIcon = (type: MessageType): string => {
    switch (type) {
      case MessageType.TEXT:
        return '';
      case MessageType.IMAGE:
        return '📷';
      case MessageType.FILE:
        return '📎';
      case MessageType.SYSTEM:
        return 'ℹ️';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}
      >
        {/* Message type indicator */}
        {message.messageType !== MessageType.TEXT && (
          <Text style={styles.typeIcon}>
            {getMessageTypeIcon(message.messageType)}
          </Text>
        )}
        
        {/* Message text */}
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}
        >
          {message.text}
        </Text>
        
        {/* Edited indicator */}
        {message.editedAt && (
          <Text style={styles.editedText}>edited</Text>
        )}
        
        {/* Deleted indicator */}
        {message.deletedAt && (
          <Text style={styles.deletedText}>This message was deleted</Text>
        )}
      </View>
      
      {/* Timestamp and status */}
      <View style={styles.footer}>
        {showTimestamp && (
          <Text style={styles.timestamp}>
            {showDetailedTimestamp ? formatDetailedTime(message.timestamp) : formatTime(message.timestamp)}
          </Text>
        )}
        
        {showStatus && isOwnMessage && (
          <Text
            style={[
              styles.statusIcon,
              { color: getStatusColor(effectiveStatus) }
            ]}
          >
            {getStatusIcon(effectiveStatus)}
          </Text>
        )}
        
        {/* Retry button for failed messages */}
        {effectiveStatus === MessageStatusType.FAILED && onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => onRetry(message.id)}
          >
            <Text style={styles.retryButtonText}>↻</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Read count for group chats */}
      {readCountText && (
        <Text style={styles.readCountText}>
          {readCountText}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 1,
    marginHorizontal: 16,
    maxWidth: '75%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 3,
  },
  otherBubble: {
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 3,
  },
  typeIcon: {
    fontSize: 14,
    marginBottom: 3,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1C1C1E',
  },
  editedText: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 3,
    opacity: 0.7,
  },
  deletedText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    marginHorizontal: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
    marginRight: 3,
    opacity: 0.6,
    fontWeight: '400',
  },
  statusIcon: {
    fontSize: 11,
    fontWeight: '500',
  },
  retryButton: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  readCountText: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
    marginHorizontal: 2,
    textAlign: 'right',
    opacity: 0.7,
  },
});

export default MessageBubble;
