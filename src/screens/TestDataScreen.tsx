import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createTestData } from '../../scripts/createTestData';

const TestDataScreen: React.FC = () => {
  const handleCreateTestData = async () => {
    try {
      await createTestData();
      Alert.alert('Success', 'Test data created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create test data');
    }
  };

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
