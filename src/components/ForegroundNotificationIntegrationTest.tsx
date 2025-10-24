import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import notificationService from '../services/notificationService';

interface ForegroundNotificationIntegrationTestProps {
  onClose?: () => void;
}

const ForegroundNotificationIntegrationTest: React.FC<ForegroundNotificationIntegrationTestProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  const checkPermissionStatus = async () => {
    try {
      const enabled = await notificationService.areNotificationsEnabled();
      setPermissionStatus(enabled ? 'granted' : 'denied');
    } catch (error) {
      console.error('🔔 Error checking permission status:', error);
      setPermissionStatus('error');
    }
  };

  const testPermissionFlow = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing permission flow integration...');
      
      // Check current status
      await checkPermissionStatus();
      
      if (permissionStatus === 'granted') {
        Alert.alert(
          'Permissions Already Granted',
          'Notification permissions are already granted. The foreground handler should be initialized.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Request Permissions',
          'This will trigger the permission modal and initialize the foreground handler if granted.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Request', 
              onPress: async () => {
                try {
                  const { status } = await notificationService.requestPermissions();
                  await checkPermissionStatus();
                  
                  Alert.alert(
                    'Permission Result',
                    `Permissions ${status === 'granted' ? 'granted' : 'denied'}. Foreground handler ${status === 'granted' ? 'should be initialized' : 'not initialized'}.`,
                    [{ text: 'OK' }]
                  );
                } catch (error) {
                  console.error('🔔 Permission request failed:', error);
                  Alert.alert('Error', 'Failed to request permissions.', [{ text: 'OK' }]);
                }
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('🧪 Permission flow test failed:', error);
      Alert.alert(
        'Test Failed',
        'Failed to test permission flow.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testForegroundNotification = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing foreground notification...');
      
      // Simulate a notification that would trigger the foreground handler
      await notificationService.checkAndSendNotification({
        chatId: 'test-integration-chat',
        messageId: 'test-integration-message',
        senderId: 'test-sender',
        messageText: 'This is a test notification to verify foreground handler integration.',
        timestamp: new Date(),
        chatType: 'direct'
      });
      
      Alert.alert(
        'Test Sent',
        'Foreground notification test has been triggered. Check if the notification appears with proper handling.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧪 Foreground notification test failed:', error);
      Alert.alert(
        'Test Failed',
        'Failed to send foreground notification test.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testServiceInitialization = async () => {
    try {
      console.log('🧪 Testing service initialization...');
      
      const isInitialized = notificationService.isServiceInitialized();
      
      Alert.alert(
        'Service Status',
        `Notification service is ${isInitialized ? 'initialized' : 'not initialized'}.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧪 Service initialization test failed:', error);
      Alert.alert(
        'Test Failed',
        'Failed to check service initialization.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Foreground Handler Integration Test</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <IconSymbol name="xmark" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          Test the integration between the foreground notification handler and the permission modal flow.
        </Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Permission Status:</Text>
          <Text style={[styles.statusValue, { 
            color: permissionStatus === 'granted' ? '#34C759' : 
                   permissionStatus === 'denied' ? '#FF3B30' : '#8E8E93' 
          }]}>
            {permissionStatus === 'granted' ? 'Granted' : 
             permissionStatus === 'denied' ? 'Denied' : 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.testButtons}>
          <TouchableOpacity
            style={[styles.testButton, styles.statusButton]}
            onPress={checkPermissionStatus}
            disabled={isLoading}
          >
            <IconSymbol name="checkmark.circle" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Check Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.permissionButton]}
            onPress={testPermissionFlow}
            disabled={isLoading}
          >
            <IconSymbol name="person.badge.key" size={24} color="#FF9500" />
            <Text style={styles.buttonText}>Test Permission Flow</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.notificationButton]}
            onPress={testForegroundNotification}
            disabled={isLoading}
          >
            <IconSymbol name="bell.fill" size={24} color="#34C759" />
            <Text style={styles.buttonText}>Test Foreground Notification</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.initButton]}
            onPress={testServiceInitialization}
            disabled={isLoading}
          >
            <IconSymbol name="gear" size={24} color="#8E8E93" />
            <Text style={styles.buttonText}>Check Service Status</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Integration Features:</Text>
          <Text style={styles.feature}>• Separated basic initialization from permission setup</Text>
          <Text style={styles.feature}>• Foreground handler initialized after permissions granted</Text>
          <Text style={styles.feature}>• Permission modal triggers proper service setup</Text>
          <Text style={styles.feature}>• Handles already-granted permissions gracefully</Text>
          <Text style={styles.feature}>• Error handling for permission failures</Text>
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
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
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
  statusButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  permissionButton: {
    backgroundColor: '#FF9500',
  },
  notificationButton: {
    backgroundColor: '#34C759',
  },
  initButton: {
    backgroundColor: '#8E8E93',
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

export default ForegroundNotificationIntegrationTest;
