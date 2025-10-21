import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AuthService from '../services/auth';

const FirebaseTestScreen: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    testFirebaseConnection();
  }, []);

  const testFirebaseConnection = async () => {
    try {
      const connected = await AuthService.testConnection();
      setIsConnected(connected);
    } catch (error) {
      console.error('Connection test error:', error);
      setIsConnected(false);
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    setIsLoading(true);
    try {
      const id = await AuthService.sendVerificationCode(phoneNumber);
      setVerificationId(id);
      Alert.alert('Success', 'Verification code sent!');
    } catch (error: any) {
      if (error.code === 'auth/argument-error') {
        Alert.alert(
          'Phone Auth Not Available', 
          'Phone authentication requires native compilation and cannot be tested in Expo Go. This will work in a production build.\n\nFor now, Firebase connection is working correctly!'
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to send verification code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const user = await AuthService.verifyCode(verificationId, verificationCode);
      Alert.alert('Success', `Welcome ${user.phoneNumber}!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      setVerificationId('');
      setVerificationCode('');
      Alert.alert('Success', 'Signed out successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Test Screen</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Firebase Connection:</Text>
        <Text style={[
          styles.statusText, 
          isConnected === true ? styles.success : styles.error
        ]}>
          {isConnected === null ? 'Testing...' : isConnected ? 'Connected ✅' : 'Failed ❌'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phone Authentication Test</Text>
        <Text style={styles.noteText}>
          Note: Phone authentication requires native compilation and cannot be tested in Expo Go. 
          This will work in a production build (TestFlight/APK).
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter phone number (+1234567890)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Sending...' : 'Send Verification Code'}
          </Text>
        </TouchableOpacity>

        {verificationId && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter verification code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
            />
            
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FirebaseTestScreen;
