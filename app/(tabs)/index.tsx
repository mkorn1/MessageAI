import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import HomeScreen from '../../src/screens/HomeScreen';
import LoginScreen from '../../src/screens/LoginScreen';

export default function MainScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Debug logging
  console.log('🏠 MainScreen render:', {
    user: user ? `User ${user.uid}` : 'No user',
    isLoading,
    shouldShowLogin: !user && !isLoading,
    shouldShowHome: user && !isLoading
  });

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('🏠 MainScreen: Showing loading spinner');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show login screen if user is not authenticated
  if (!user) {
    console.log('🏠 MainScreen: Showing login screen');
    return <LoginScreen />;
  }

  // Show home screen if user is authenticated
  console.log('🏠 MainScreen: Showing home screen');
  return <HomeScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
});
