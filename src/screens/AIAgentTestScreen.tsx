/**
 * AI Agent Quick Test Script
 * 
 * This script provides a quick way to test the AI agent functionality
 * without requiring a full testing setup.
 */

import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useAISuggestions } from '../src/hooks/useAISuggestions';
import { useMessageAnalysis } from '../src/hooks/useMessageAnalysis';
import { AISuggestionStatus } from '../src/types/aiSuggestion';

interface TestResult {
  testName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

const AIAgentTestScreen: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // AI Suggestions hook for testing
  const {
    suggestions,
    loading: suggestionsLoading,
    error: suggestionsError,
    refresh: refreshSuggestions,
    updateSuggestion,
    getPendingSuggestionsCount,
  } = useAISuggestions({
    status: AISuggestionStatus.Pending,
    enableRealtime: true,
  });

  // Message Analysis hook for testing
  const {
    analyzeMessage,
    isAnalyzing,
    lastAnalysisResult,
  } = useMessageAnalysis({
    enabled: true,
    onAnalysisComplete: (suggestionCount) => {
      console.log('✅ Analysis completed, suggestions created:', suggestionCount);
    },
    onAnalysisError: (error) => {
      console.error('❌ Analysis error:', error);
    },
  });

  const addTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => [...prev, { testName, status, message, duration }]);
  };

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => prev.map(result => 
      result.testName === testName 
        ? { ...result, status, message, duration }
        : result
    ));
  };

  const runTest = async (testName: string, testFunction: () => Promise<void>) => {
    const startTime = Date.now();
    updateTestResult(testName, 'running');
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'passed', 'Test passed successfully', duration);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'failed', error.message, duration);
    }
  };

  // Test 1: Check Authentication
  const testAuthentication = async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }
    console.log('✅ User authenticated:', user.uid);
  };

  // Test 2: Check AI Suggestions Hook
  const testAISuggestionsHook = async () => {
    if (suggestionsError) {
      throw new Error(`AI Suggestions hook error: ${suggestionsError}`);
    }
    console.log('✅ AI Suggestions hook working, suggestions count:', suggestions.length);
  };

  // Test 3: Check Message Analysis Hook
  const testMessageAnalysisHook = async () => {
    if (!analyzeMessage) {
      throw new Error('Message analysis hook not available');
    }
    console.log('✅ Message analysis hook available');
  };

  // Test 4: Test Suggestion Creation (Simulated)
  const testSuggestionCreation = async () => {
    // This would normally be triggered by sending a message
    // For testing, we'll just verify the hook is ready
    if (isAnalyzing) {
      throw new Error('Message analysis already in progress');
    }
    console.log('✅ Ready to create suggestions via message analysis');
  };

  // Test 5: Test Suggestion Actions
  const testSuggestionActions = async () => {
    if (suggestions.length === 0) {
      console.log('ℹ️ No suggestions available for action testing');
      return;
    }

    const testSuggestion = suggestions[0];
    console.log('🧪 Testing actions on suggestion:', testSuggestion.id);
    
    // Test update functionality
    const updateResult = await updateSuggestion(testSuggestion.id, {
      status: AISuggestionStatus.Confirmed,
      confirmedAt: new Date(),
    });

    if (!updateResult.success) {
      throw new Error(`Failed to update suggestion: ${updateResult.error?.message}`);
    }
    
    console.log('✅ Suggestion action test passed');
  };

  // Test 6: Test Real-time Updates
  const testRealTimeUpdates = async () => {
    const initialCount = suggestions.length;
    console.log('📊 Initial suggestions count:', initialCount);
    
    // Refresh to test real-time updates
    await refreshSuggestions();
    
    console.log('✅ Real-time updates test completed');
  };

  // Test 7: Test Badge Count
  const testBadgeCount = async () => {
    const pendingCount = getPendingSuggestionsCount();
    console.log('🔢 Pending suggestions count:', pendingCount);
    
    if (pendingCount < 0) {
      throw new Error('Invalid pending count');
    }
    
    console.log('✅ Badge count test passed');
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      { name: 'Authentication Check', fn: testAuthentication },
      { name: 'AI Suggestions Hook', fn: testAISuggestionsHook },
      { name: 'Message Analysis Hook', fn: testMessageAnalysisHook },
      { name: 'Suggestion Creation', fn: testSuggestionCreation },
      { name: 'Suggestion Actions', fn: testSuggestionActions },
      { name: 'Real-time Updates', fn: testRealTimeUpdates },
      { name: 'Badge Count', fn: testBadgeCount },
    ];

    for (const test of tests) {
      await runTest(test.name, test.fn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  // Run individual test
  const runIndividualTest = async (testName: string, testFunction: () => Promise<void>) => {
    setIsRunning(true);
    await runTest(testName, testFunction);
    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '#8E8E93';
      case 'running': return '#007AFF';
      case 'passed': return '#34C759';
      case 'failed': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'passed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const passedTests = testResults.filter(r => r.status === 'passed').length;
  const failedTests = testResults.filter(r => r.status === 'failed').length;
  const totalTests = testResults.length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Agent Test Suite</Text>
        <Text style={styles.subtitle}>Quick functionality verification</Text>
      </View>

      {/* Test Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={isRunning || !user}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Run All Tests</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => runIndividualTest('Authentication Check', testAuthentication)}
          disabled={isRunning}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Test Auth</Text>
        </TouchableOpacity>
      </View>

      {/* Test Status */}
      {totalTests > 0 && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Test Results</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              ✅ Passed: {passedTests} | ❌ Failed: {failedTests} | 📊 Total: {totalTests}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${totalTests > 0 ? (passedTests / totalTests) * 100 : 0}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Test Results */}
      <View style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>{getStatusIcon(result.status)}</Text>
              <Text style={[styles.resultName, { color: getStatusColor(result.status) }]}>
                {result.testName}
              </Text>
              {result.duration && (
                <Text style={styles.resultDuration}>{result.duration}ms</Text>
              )}
            </View>
            {result.message && (
              <Text style={styles.resultMessage}>{result.message}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Current State Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Current State</Text>
        <Text style={styles.infoText}>User: {user?.uid ? '✅ Authenticated' : '❌ Not authenticated'}</Text>
        <Text style={styles.infoText}>Suggestions: {suggestions.length}</Text>
        <Text style={styles.infoText}>Pending: {getPendingSuggestionsCount()}</Text>
        <Text style={styles.infoText}>Analyzing: {isAnalyzing ? '🔄 Yes' : '✅ No'}</Text>
        {suggestionsError && (
          <Text style={[styles.infoText, styles.errorText]}>Error: {suggestionsError}</Text>
        )}
      </View>

      {/* Manual Test Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Manual Testing</Text>
        <Text style={styles.instructionsText}>
          1. Go to Notifications → To-do's tab{'\n'}
          2. Send a test message: "Let's meet tomorrow at 2pm"{'\n'}
          3. Wait for AI suggestion to appear{'\n'}
          4. Confirm or reject the suggestion{'\n'}
          5. Verify action execution
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
  controls: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resultDuration: {
    fontSize: 12,
    color: '#8E8E93',
  },
  resultMessage: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 24,
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  errorText: {
    color: '#FF3B30',
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
});

export default AIAgentTestScreen;
