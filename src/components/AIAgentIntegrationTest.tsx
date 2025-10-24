/**
 * AI Agent Integration Test Component
 * 
 * This component provides a simple way to test the AI agent functionality
 * directly within the app. Add this to your app for quick testing.
 */

import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAISuggestions } from '../hooks/useAISuggestions';
import { useMessageAnalysis } from '../hooks/useMessageAnalysis';
import { AISuggestionStatus } from '../types/aiSuggestion';
import { Message } from '../types/message';

const AIAgentIntegrationTest: React.FC = () => {
  const { user } = useAuth();
  const [testMessage, setTestMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Message Analysis hook
  const {
    analyzeMessage,
    isAnalyzing,
    lastAnalysisResult,
  } = useMessageAnalysis({
    enabled: true,
    onAnalysisComplete: (suggestionCount) => {
      addTestResult(`✅ Analysis completed: ${suggestionCount} suggestions created`);
    },
    onAnalysisError: (error) => {
      addTestResult(`❌ Analysis error: ${error}`);
    },
  });

  // AI Suggestions hook
  const {
    suggestions,
    loading: suggestionsLoading,
    refresh: refreshSuggestions,
    getPendingSuggestionsCount,
  } = useAISuggestions({
    status: AISuggestionStatus.Pending,
    enableRealtime: true,
  });

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testCustomMessage = async () => {
    if (!testMessage.trim()) {
      Alert.alert('Error', 'Please enter a test message');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsTesting(true);
    addTestResult(`🧪 Testing message: "${testMessage}"`);

    try {
      // Create a test message object
      const message: Message = {
        id: `test-${Date.now()}`,
        text: testMessage,
        senderId: user.uid,
        chatId: 'test-chat-integration',
        timestamp: new Date(),
        messageType: 'text',
        status: 'sent'
      };

      // Analyze the message
      addTestResult('📤 Sending message for analysis...');
      const result = await analyzeMessage(message);

      if (result.success) {
        addTestResult('✅ Message analysis completed successfully');
        
        // Wait a moment for suggestions to be created
        setTimeout(async () => {
          await refreshSuggestions();
          const pendingCount = getPendingSuggestionsCount();
          addTestResult(`📊 Current pending suggestions: ${pendingCount}`);
        }, 2000);
      } else {
        addTestResult(`❌ Message analysis failed: ${result.error?.message}`);
      }

    } catch (error: any) {
      addTestResult(`💥 Test error: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const testPredefinedMessages = async () => {
    const predefinedMessages = [
      "Let's meet tomorrow at 2pm in Conference Room A",
      "URGENT: Server is down and customers can't access the app!",
      "I think we should go with Option A. Sarah agrees, but Mike prefers Option B.",
      "Please RSVP for the team dinner next Friday by Wednesday",
      "Don't forget the project deadline is next Monday at 5pm"
    ];

    setIsTesting(true);
    addTestResult('🧪 Testing predefined messages...');

    for (let i = 0; i < predefinedMessages.length; i++) {
      const message = predefinedMessages[i];
      addTestResult(`📝 Testing message ${i + 1}: "${message}"`);
      
      if (!user?.uid) {
        addTestResult('❌ User not authenticated');
        break;
      }

      try {
        const testMessage: Message = {
          id: `test-predefined-${i}-${Date.now()}`,
          text: message,
          senderId: user.uid,
          chatId: 'test-chat-predefined',
          timestamp: new Date(),
          messageType: 'text',
          status: 'sent'
        };

        const result = await analyzeMessage(testMessage);
        
        if (result.success) {
          addTestResult(`✅ Message ${i + 1} analyzed successfully`);
        } else {
          addTestResult(`❌ Message ${i + 1} failed: ${result.error?.message}`);
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        addTestResult(`💥 Message ${i + 1} error: ${error.message}`);
      }
    }

    // Final refresh
    setTimeout(async () => {
      await refreshSuggestions();
      const pendingCount = getPendingSuggestionsCount();
      addTestResult(`📊 Final pending suggestions count: ${pendingCount}`);
    }, 2000);

    setIsTesting(false);
  };

  const checkSystemStatus = () => {
    addTestResult('🔍 Checking system status...');
    addTestResult(`👤 User authenticated: ${user?.uid ? 'Yes' : 'No'}`);
    addTestResult(`📊 Current suggestions: ${suggestions.length}`);
    addTestResult(`⏳ Pending suggestions: ${getPendingSuggestionsCount()}`);
    addTestResult(`🔄 Currently analyzing: ${isAnalyzing ? 'Yes' : 'No'}`);
    addTestResult(`📈 Last analysis result: ${lastAnalysisResult ? 'Available' : 'None'}`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Agent Integration Test</Text>
        <Text style={styles.subtitle}>Test the AI agent functionality</Text>
      </View>

      {/* System Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>User:</Text>
          <Text style={styles.statusValue}>{user?.uid ? '✅ Authenticated' : '❌ Not authenticated'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Suggestions:</Text>
          <Text style={styles.statusValue}>{suggestions.length}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Pending:</Text>
          <Text style={styles.statusValue}>{getPendingSuggestionsCount()}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Analyzing:</Text>
          <Text style={styles.statusValue}>{isAnalyzing ? '🔄 Yes' : '✅ No'}</Text>
        </View>
      </View>

      {/* Custom Message Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Message Test</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter a test message..."
          value={testMessage}
          onChangeText={setTestMessage}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testCustomMessage}
          disabled={isTesting || !testMessage.trim()}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Test Custom Message</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Predefined Messages Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Predefined Messages Test</Text>
        <Text style={styles.description}>
          Test with common message types that should trigger AI suggestions
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testPredefinedMessages}
          disabled={isTesting}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Test Predefined Messages</Text>
        </TouchableOpacity>
      </View>

      {/* System Check */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Check</Text>
        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={checkSystemStatus}
          disabled={isTesting}
        >
          <Text style={[styles.buttonText, styles.tertiaryButtonText]}>Check System Status</Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <TouchableOpacity onPress={clearResults}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.resultsContainer}>
          {testResults.length === 0 ? (
            <Text style={styles.noResults}>No test results yet</Text>
          ) : (
            testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>{result}</Text>
            ))
          )}
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instructions}>
          1. Make sure you're authenticated{'\n'}
          2. Enter a test message or use predefined ones{'\n'}
          3. Check the test results below{'\n'}
          4. Go to Notifications → To-do's to see suggestions{'\n'}
          5. Test confirming/rejecting suggestions
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#8E8E93',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#F2F2F7',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  tertiaryButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  tertiaryButtonText: {
    color: '#8E8E93',
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
  },
  noResults: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultText: {
    fontSize: 12,
    color: '#1C1C1E',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  instructions: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
});

export default AIAgentIntegrationTest;
