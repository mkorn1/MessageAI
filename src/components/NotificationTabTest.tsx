import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import notificationService from '../services/notificationService';
import notificationStorageService from '../services/notificationStorage';

interface NotificationTabTestProps {
  onClose?: () => void;
}

const NotificationTabTest: React.FC<NotificationTabTestProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);

  const testNotificationStorage = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing notification storage...');
      
      // Create a test notification
      const testNotification = {
        title: 'Test Notification',
        body: 'This is a test notification for the notifications tab',
        data: {
          chatId: 'test-chat-123',
          messageId: 'test-message-456',
          senderId: 'test-sender-789',
          senderName: 'Test User',
          chatName: 'Test Chat',
          chatType: 'direct' as const,
          messageText: 'This is a test message'
        }
      };

      // Store the notification
      await notificationStorageService.storeNotification(testNotification);
      
      Alert.alert(
        'Test Notification Stored',
        'A test notification has been added to the notifications tab. Check the notifications tab to see it!',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧪 Notification storage test failed:', error);
      Alert.alert(
        'Test Failed',
        'Failed to store test notification.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testMultipleNotifications = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing multiple notifications...');
      
      const notifications = [
        {
          title: 'Alice Johnson',
          body: 'Hey! How are you doing today?',
          data: {
            chatId: 'chat-1',
            messageId: 'msg-1',
            senderId: 'alice-123',
            senderName: 'Alice Johnson',
            chatName: 'Direct Message',
            chatType: 'direct' as const,
            messageText: 'Hey! How are you doing today?'
          }
        },
        {
          title: 'Bob Smith in Team Chat',
          body: 'Great work on the project!',
          data: {
            chatId: 'chat-2',
            messageId: 'msg-2',
            senderId: 'bob-456',
            senderName: 'Bob Smith',
            chatName: 'Team Chat',
            chatType: 'group' as const,
            messageText: 'Great work on the project!'
          }
        },
        {
          title: 'Carol Davis',
          body: 'Can we meet tomorrow at 2pm?',
          data: {
            chatId: 'chat-3',
            messageId: 'msg-3',
            senderId: 'carol-789',
            senderName: 'Carol Davis',
            chatName: 'Direct Message',
            chatType: 'direct' as const,
            messageText: 'Can we meet tomorrow at 2pm?'
          }
        }
      ];

      // Store all notifications
      for (const notification of notifications) {
        await notificationStorageService.storeNotification(notification);
        // Small delay between notifications to show different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      Alert.alert(
        'Multiple Notifications Stored',
        `${notifications.length} test notifications have been added to the notifications tab. Check the notifications tab to see them!`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧪 Multiple notifications test failed:', error);
      Alert.alert(
        'Test Failed',
        'Failed to store multiple notifications.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testNotificationService = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing notification service integration...');
      
      // Test the notification service's checkAndSendNotification method
      await notificationService.checkAndSendNotification({
        chatId: 'service-test-chat',
        messageId: 'service-test-message',
        senderId: 'service-test-sender',
        messageText: 'This notification was created via the notification service!',
        timestamp: new Date(),
        chatType: 'direct'
      });
      
      Alert.alert(
        'Notification Service Test',
        'A notification has been created via the notification service and should appear in the notifications tab.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧪 Notification service test failed:', error);
      Alert.alert(
        'Test Failed',
        'Failed to test notification service.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await notificationStorageService.clearAllNotifications();
      Alert.alert(
        'Notifications Cleared',
        'All notifications have been cleared from the notifications tab.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('🧪 Clear notifications failed:', error);
      Alert.alert(
        'Clear Failed',
        'Failed to clear notifications.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Tab Test</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <IconSymbol name="xmark" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          Test the notifications tab functionality by creating sample notifications.
        </Text>
        
        <View style={styles.testButtons}>
          <TouchableOpacity
            style={[styles.testButton, styles.singleButton]}
            onPress={testNotificationStorage}
            disabled={isLoading}
          >
            <IconSymbol name="bell.fill" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Add Single Notification</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.multipleButton]}
            onPress={testMultipleNotifications}
            disabled={isLoading}
          >
            <IconSymbol name="bell.badge.fill" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Add Multiple Notifications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.serviceButton]}
            onPress={testNotificationService}
            disabled={isLoading}
          >
            <IconSymbol name="gear" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Test Notification Service</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.clearButton]}
            onPress={clearAllNotifications}
            disabled={isLoading}
          >
            <IconSymbol name="trash.fill" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Clear All Notifications</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Features Tested:</Text>
          <Text style={styles.feature}>• Local notification storage</Text>
          <Text style={styles.feature}>• Notification list display</Text>
          <Text style={styles.feature}>• Tap-to-navigate functionality</Text>
          <Text style={styles.feature}>• Mark as read/unread</Text>
          <Text style={styles.feature}>• Delete individual notifications</Text>
          <Text style={styles.feature}>• Clear all notifications</Text>
          <Text style={styles.feature}>• Integration with NotificationService</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 24,
  },
  testButtons: {
    gap: 12,
    marginBottom: 32,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  singleButton: {
    backgroundColor: '#007AFF',
  },
  multipleButton: {
    backgroundColor: '#34C759',
  },
  serviceButton: {
    backgroundColor: '#FF9500',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  features: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  feature: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 6,
  },
});

export default NotificationTabTest;
