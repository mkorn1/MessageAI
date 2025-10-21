import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Message, MessageStatus, MessageType } from '../types';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showTimestamp?: boolean;
  showStatus?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  showDetailedTimestamp?: boolean;
  onRetry?: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  showTimestamp = true,
  showStatus = true,
  onPress,
  onLongPress,
  showDetailedTimestamp = false,
  onRetry
}) => {
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

  const getStatusIcon = (status: MessageStatus): string => {
    switch (status) {
      case MessageStatus.SENDING:
        return '⏳';
      case MessageStatus.SENT:
        return '✓';
      case MessageStatus.DELIVERED:
        return '✓✓';
      case MessageStatus.READ:
        return '✓✓';
      case MessageStatus.FAILED:
        return '⚠️';
      default:
        return '';
    }
  };

  const getStatusColor = (status: MessageStatus): string => {
    switch (status) {
      case MessageStatus.SENDING:
        return '#999';
      case MessageStatus.SENT:
        return '#999';
      case MessageStatus.DELIVERED:
        return '#999';
      case MessageStatus.READ:
        return '#007AFF';
      case MessageStatus.FAILED:
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
              { color: getStatusColor(message.status) }
            ]}
          >
            {getStatusIcon(message.status)}
          </Text>
        )}
        
        {/* Retry button for failed messages */}
        {message.status === MessageStatus.FAILED && onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => onRetry(message.id)}
          >
            <Text style={styles.retryButtonText}>↻</Text>
          </TouchableOpacity>
        )}
      </View>
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
});

export default MessageBubble;
