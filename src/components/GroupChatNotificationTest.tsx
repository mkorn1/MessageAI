import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import notificationService from '../services/notificationService';

interface GroupChatNotificationTestProps {
  onClose?: () => void;
}

const GroupChatNotificationTest: React.FC<GroupChatNotificationTestProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);

  const testGroupChatNotification = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing group chat notification...');
      
      // Simulate a group chat message
      await notificationService.checkAndSendNotification({
        chatId: 'test-group-chat-123',
        messageId: 'test-message-456',
        senderId: 'test-sender-789',
        messageText: 'Hey everyone! How is the project going? We should discuss the next steps for the notification system.',
        timestamp: new Date(),
        chatType: 'group'
      });
      
      Alert.alert(
        'Test Sent',
        'Group chat notification test has been triggered. Check if the notification appears with proper formatting.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧪 Group chat notification test failed:', error);
      Alert.alert(
        'Test Failed',
        'Failed to send group chat notification test.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectChatNotification = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing direct chat notification...');
      
      // Simulate a direct chat message
      await notificationService.checkAndSendNotification({
        chatId: 'test-direct-chat-123',
        messageId: 'test-message-456',
        senderId: 'test-sender-789',
        messageText: 'Hi! Can you help me with the notification implementation?',
        timestamp: new Date(),
        chatType: 'direct'
      });
      
      Alert.alert(
        'Test Sent',
        'Direct chat notification test has been triggered. Check if the notification appears with proper formatting.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧪 Direct chat notification test failed:', error);
      Alert.alert(
        'Test Failed',
        'Failed to send direct chat notification test.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Group Chat Notification Test</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <IconSymbol name="xmark" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          Test the enhanced group chat notification system with proper naming and formatting.
        </Text>
        
        <View style={styles.testButtons}>
          <TouchableOpacity
            style={[styles.testButton, styles.groupButton]}
            onPress={testGroupChatNotification}
            disabled={isLoading}
          >
            <IconSymbol name="person.2.fill" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Test Group Chat</Text>
            <Text style={styles.buttonSubtext}>"John in Team Chat"</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.directButton]}
            onPress={testDirectChatNotification}
            disabled={isLoading}
          >
            <IconSymbol name="person.fill" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Test Direct Chat</Text>
            <Text style={styles.buttonSubtext}>"Sarah"</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Enhanced Features:</Text>
          <Text style={styles.feature}>• Proper sender name fetching</Text>
          <Text style={styles.feature}>• Group chat name display</Text>
          <Text style={styles.feature}>• Chat type-specific formatting</Text>
          <Text style={styles.feature}>• Message preview truncation</Text>
          <Text style={styles.feature}>• Fallback handling for missing data</Text>
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
    gap: 16,
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
  groupButton: {
    backgroundColor: '#007AFF',
  },
  directButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
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

export default GroupChatNotificationTest;
