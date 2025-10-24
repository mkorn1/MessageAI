import * as Device from 'expo-device';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import notificationService from '../services/notificationService';

interface PermissionTestProps {
  onClose?: () => void;
}

const PermissionTest: React.FC<PermissionTestProps> = ({ onClose }) => {
  const [testResults, setTestResults] = useState<Array<{ test: string; status: 'pending' | 'pass' | 'fail'; details: string }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ isDevice: boolean; modelName?: string }>({ isDevice: false });

  useEffect(() => {
    // Get device information
    setDeviceInfo({
      isDevice: Device.isDevice,
      modelName: Device.modelName || 'Unknown'
    });
  }, []);

  const addTestResult = (test: string, status: 'pass' | 'fail', details: string) => {
    setTestResults(prev => [...prev, { test, status, details }]);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      console.log('🧪 Starting comprehensive iOS permission test...');
      
      // Test 1: Device Detection
      console.log('🧪 Test 1: Device Detection');
      if (Device.isDevice) {
        addTestResult('Device Detection', 'pass', `Physical device detected: ${Device.modelName}`);
      } else {
        addTestResult('Device Detection', 'fail', 'Simulator detected - some features may not work');
      }
      
      // Test 2: Service Initialization
      console.log('🧪 Test 2: Service Initialization');
      const isInitialized = notificationService.isServiceInitialized();
      addTestResult('Service Initialization', isInitialized ? 'pass' : 'fail', 
        `Service ${isInitialized ? 'initialized' : 'not initialized'}`);
      
      // Test 3: Permission Status Check
      console.log('🧪 Test 3: Permission Status Check');
      try {
        const hasPermissions = await notificationService.areNotificationsEnabled();
        addTestResult('Permission Status Check', 'pass', 
          `Permissions ${hasPermissions ? 'granted' : 'not granted'}`);
      } catch (error) {
        addTestResult('Permission Status Check', 'fail', `Error: ${error}`);
      }
      
      // Test 4: FCM Token (if on device)
      if (Device.isDevice) {
        console.log('🧪 Test 4: FCM Token');
        try {
          const token = await notificationService.getFCMToken();
          if (token) {
            addTestResult('FCM Token', 'pass', `Token obtained: ${token.substring(0, 20)}...`);
          } else {
            addTestResult('FCM Token', 'fail', 'No token obtained');
          }
        } catch (error) {
          addTestResult('FCM Token', 'fail', `Error: ${error}`);
        }
      } else {
        addTestResult('FCM Token', 'pass', 'Skipped on simulator (expected)');
      }
      
      // Test 5: Permission Request Flow
      console.log('🧪 Test 5: Permission Request Flow');
      try {
        const { status } = await notificationService.requestPermissions();
        addTestResult('Permission Request Flow', 'pass', 
          `Permission request completed with status: ${status}`);
      } catch (error) {
        addTestResult('Permission Request Flow', 'fail', `Error: ${error}`);
      }
      
      // Test 6: Final Permission Status
      console.log('🧪 Test 6: Final Permission Status');
      try {
        const finalPermissions = await notificationService.areNotificationsEnabled();
        addTestResult('Final Permission Status', 'pass', 
          `Final status: ${finalPermissions ? 'granted' : 'not granted'}`);
      } catch (error) {
        addTestResult('Final Permission Status', 'fail', `Error: ${error}`);
      }
      
      console.log('🧪 Comprehensive test completed');
      
    } catch (error) {
      console.error('🧪 Test failed:', error);
      addTestResult('Test Execution', 'fail', `Test execution failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testPermissionModal = async () => {
    try {
      console.log('🧪 Testing permission modal flow...');
      
      // This will trigger the permission modal if permissions are not granted
      const { status } = await notificationService.requestPermissions();
      
      Alert.alert(
        'Permission Test Result',
        `Permission request completed with status: ${status}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧪 Permission modal test failed:', error);
      Alert.alert(
        'Test Failed',
        `Permission modal test failed: ${error}`,
        [{ text: 'OK' }]
      );
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const getStatusIcon = (status: 'pending' | 'pass' | 'fail') => {
    switch (status) {
      case 'pass':
        return <IconSymbol name="checkmark.circle.fill" size={20} color="#34C759" />;
      case 'fail':
        return <IconSymbol name="xmark.circle.fill" size={20} color="#FF3B30" />;
      default:
        return <IconSymbol name="clock" size={20} color="#8E8E93" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'pass' | 'fail') => {
    switch (status) {
      case 'pass':
        return '#34C759';
      case 'fail':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>iOS Permission Test</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <IconSymbol name="xmark" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceInfoTitle}>Device Information</Text>
          <Text style={styles.deviceInfoText}>
            Device Type: {deviceInfo.isDevice ? 'Physical Device' : 'Simulator'}
          </Text>
          {deviceInfo.modelName && (
            <Text style={styles.deviceInfoText}>
              Model: {deviceInfo.modelName}
            </Text>
          )}
        </View>
        
        <View style={styles.testButtons}>
          <TouchableOpacity
            style={[styles.testButton, styles.primaryButton]}
            onPress={runComprehensiveTest}
            disabled={isRunning}
          >
            <IconSymbol name="play.circle.fill" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {isRunning ? 'Running Tests...' : 'Run Comprehensive Test'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.secondaryButton]}
            onPress={testPermissionModal}
            disabled={isRunning}
          >
            <IconSymbol name="person.badge.key" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Test Permission Modal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, styles.clearButton]}
            onPress={clearTestResults}
            disabled={isRunning}
          >
            <IconSymbol name="trash" size={24} color="#8E8E93" />
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>
        
        {testResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            {testResults.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  {getStatusIcon(result.status)}
                  <Text style={[styles.resultTest, { color: getStatusColor(result.status) }]}>
                    {result.test}
                  </Text>
                </View>
                <Text style={styles.resultDetails}>{result.details}</Text>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Testing Instructions</Text>
          <Text style={styles.instructionText}>
            1. Run the comprehensive test to check all components
          </Text>
          <Text style={styles.instructionText}>
            2. Test the permission modal to verify UI flow
          </Text>
          <Text style={styles.instructionText}>
            3. Check console logs for detailed information
          </Text>
          <Text style={styles.instructionText}>
            4. Document any issues or unexpected behavior
          </Text>
        </View>
      </ScrollView>
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
  deviceInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deviceInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  deviceInfoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  testButtons: {
    gap: 12,
    marginBottom: 24,
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
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 12,
    flex: 1,
  },
  resultsContainer: {
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
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  resultItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 28,
  },
  instructions: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 6,
    lineHeight: 20,
  },
});

export default PermissionTest;
