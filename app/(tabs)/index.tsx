import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import HomeScreen from '../../src/screens/HomeScreen';
import LoginScreen from '../../src/screens/LoginScreen';

export default function MainScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show login screen if user is not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show home screen if user is authenticated
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
