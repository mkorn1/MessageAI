import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createTestData } from '../../scripts/createTestData';
import ForegroundNotificationIntegrationTest from '../components/ForegroundNotificationIntegrationTest';
import GroupChatNotificationTest from '../components/GroupChatNotificationTest';
import NotificationTabTest from '../components/NotificationTabTest';
import PermissionTest from '../components/PermissionTest';

const TestDataScreen: React.FC = () => {
  const [activeTest, setActiveTest] = useState<string | null>(null);

  const handleCreateTestData = async () => {
    try {
      await createTestData();
      Alert.alert('Success', 'Test data created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create test data');
    }
  };

  const renderTestComponent = () => {
    switch (activeTest) {
      case 'ios-permission':
        return <PermissionTest onClose={() => setActiveTest(null)} />;
      case 'group-chat':
        return <GroupChatNotificationTest onClose={() => setActiveTest(null)} />;
      case 'foreground-integration':
        return <ForegroundNotificationIntegrationTest onClose={() => setActiveTest(null)} />;
      case 'notification-tab':
        return <NotificationTabTest onClose={() => setActiveTest(null)} />;
      default:
        return null;
    }
  };

  if (activeTest) {
    return renderTestComponent();
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Test Data</Text>
        <Text style={styles.subtitle}>
          This will create a test chat and some sample messages in Firestore.
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleCreateTestData}
        >
          <Text style={styles.buttonText}>Create Test Chat & Messages</Text>
        </TouchableOpacity>
        
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Notification Tests</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.testButton]}
            onPress={() => setActiveTest('ios-permission')}
          >
            <Text style={styles.buttonText}>iOS Permission Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.testButton]}
            onPress={() => setActiveTest('group-chat')}
          >
            <Text style={styles.buttonText}>Group Chat Notification Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.testButton]}
            onPress={() => setActiveTest('foreground-integration')}
          >
            <Text style={styles.buttonText}>Foreground Integration Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.testButton]}
            onPress={() => setActiveTest('notification-tab')}
          >
            <Text style={styles.buttonText}>Notification Tab Test</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>What this creates:</Text>
          <Text style={styles.noteText}>
            • A chat document with ID "test-chat-123"{'\n'}
            • 3 sample messages in the messages collection{'\n'}
            • Proper chatId references for the messages
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  testButton: {
    backgroundColor: '#34C759',
    marginBottom: 16,
  },
  testSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteSection: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#856404',
  },
  noteText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});

export default TestDataScreen;
