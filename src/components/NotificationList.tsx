import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import notificationStorageService, { StoredNotification } from '../services/notificationStorage';

interface NotificationListProps {
  onNotificationPress?: (notification: StoredNotification) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({ onNotificationPress }) => {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { updateUnreadCount, markAsRead: markNotificationAsRead, markAllAsRead: markAllNotificationsAsRead } = useUnreadNotificationCount();

  const loadNotifications = useCallback(async () => {
    try {
      const storedNotifications = await notificationStorageService.getStoredNotifications();
      setNotifications(storedNotifications);
      // Update unread count after loading notifications
      await updateUnreadCount();
    } catch (error) {
      console.error('🔔 NotificationList: Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [updateUnreadCount]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  }, [loadNotifications]);

  const handleNotificationPress = useCallback(async (notification: StoredNotification) => {
    try {
      // Mark as read using the hook
      await markNotificationAsRead(notification.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );

      // Navigate to chat
      router.push(`/chat?chatId=${notification.chatId}` as any);
      
      // Call parent callback if provided
      onNotificationPress?.(notification);
    } catch (error) {
      console.error('🔔 NotificationList: Failed to handle notification press:', error);
    }
  }, [markNotificationAsRead, onNotificationPress]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('🔔 NotificationList: Failed to mark all as read:', error);
    }
  }, [markAllNotificationsAsRead]);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationStorageService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('🔔 NotificationList: Failed to delete notification:', error);
    }
  }, []);

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const renderNotificationItem = ({ item }: { item: StoredNotification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <IconSymbol
            name={item.data.chatType === 'group' ? 'person.2.fill' : 'person.fill'}
            size={20}
            color={item.isRead ? '#8E8E93' : '#007AFF'}
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            !item.isRead && styles.unreadTitle
          ]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          {item.data.chatType === 'group' && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.data.chatName}
            </Text>
          )}
        </View>
        
        <View style={styles.rightContainer}>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNotification(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <IconSymbol name="trash" size={16} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="bell.fill" size={48} color="#8E8E93" />
      <Text style={styles.emptyStateTitle}>No notifications yet</Text>
      <Text style={styles.emptyStateText}>
        You'll see notifications here when you receive new messages
      </Text>
    </View>
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E5EA',
  },
  unreadNotification: {
    borderLeftColor: '#007AFF',
    backgroundColor: '#F8F9FF',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificationList;
