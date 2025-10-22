import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/auth';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth(); // Add this to access auth state

  // Debug logging
  console.log('🔐 LoginScreen render:', {
    user: user ? `User ${user.uid}` : 'No user',
    shouldShowLogin: !user
  });

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 LoginScreen: Starting email authentication...');
      if (isSignUp) {
        const user = await AuthService.signUpWithEmail(email, password);
        console.log('🔐 LoginScreen: Sign up successful:', user.uid);
        Alert.alert('Success', 'Account created successfully!');
      } else {
        const user = await AuthService.signInWithEmail(email, password);
        console.log('🔐 LoginScreen: Sign in successful:', user.uid);
        Alert.alert('Success', 'Signed in successfully!');
      }
      // Navigation will be handled by AuthContext automatically
    } catch (error: any) {
      console.error('🔐 LoginScreen: Authentication error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      await AuthService.signInWithGoogle();
      Alert.alert('Success', 'Signed in with Google successfully!');
      // Navigation will be handled by AuthContext automatically
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookAuth = async () => {
    setIsLoading(true);
    try {
      await AuthService.signInWithFacebook();
      Alert.alert('Success', 'Signed in with Facebook successfully!');
      // Navigation will be handled by AuthContext automatically
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Facebook sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to MessageAI</Text>
        <Text style={styles.subtitle}>Choose your sign-in method</Text>

        {/* Email Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSignUp ? 'Create Account' : 'Sign In'} with Email
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <TouchableOpacity 
            style={[styles.button, styles.emailButton, isLoading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign in with Social Media</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleAuth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>🔍 Sign in with Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.facebookButton, isLoading && styles.buttonDisabled]}
            onPress={handleFacebookAuth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>📘 Sign in with Facebook</Text>
          </TouchableOpacity>
        </View>

        {/* Phone Authentication Note */}
        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>Phone Authentication</Text>
          <Text style={styles.noteText}>
            Phone authentication is available but requires native compilation (TestFlight/APK builds). 
            It cannot be tested in Expo Go.
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
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
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
  emailButton: {
    backgroundColor: '#007AFF',
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
  },
  switchButton: {
    alignItems: 'center',
    padding: 10,
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  noteSection: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
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

export default LoginScreen;
