import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import NotificationPermissionsModal from '../components/NotificationPermissionsModal';
import { useNotificationPermissions } from '../hooks/useNotificationPermissions';
import AuthService, { User } from '../services/auth';
import notificationPreferencesService from '../services/notificationPreferencesService';
import notificationService from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const previousUserRef = useRef<User | null>(null);
  const hasAttemptedTokenRegistration = useRef(false);
  
  // Notification permissions hook
  const {
    hasPermissions,
    showPermissionModal,
    requestPermissions,
    skipPermissions,
  } = useNotificationPermissions();

  // Initialize notification service once on mount
  useEffect(() => {
    console.log('🔐 AuthContext: Initializing notification service');
    notificationService.initialize();
  }, []);

  // Listen to authentication state changes
  useEffect(() => {
    console.log('🔐 AuthContext: Setting up auth state listener');
    
    const unsubscribe = AuthService.onAuthStateChanged(async (newUser) => {
      console.log('🔐 AuthContext: Auth state changed:', newUser ? `User ${newUser.uid}` : 'No user');
      
      if (newUser) {
        // User logged in - load notification preferences
        console.log('🔔 AuthContext: Loading notification preferences');
        await notificationPreferencesService.loadPreferences(newUser.uid);
        
        // Reset registration flag when user changes
        if (previousUserRef.current?.uid !== newUser.uid) {
          hasAttemptedTokenRegistration.current = false;
        }
      } else if (previousUserRef.current) {
        // User logged out - remove FCM token
        console.log('🔔 AuthContext: User logged out, removing FCM token');
        await notificationService.removeTokenFromUser(previousUserRef.current.uid);
        
        // Clear notification preferences
        console.log('🔔 AuthContext: Clearing notification preferences');
        notificationPreferencesService.clearListeners();
        
        // Reset registration flag
        hasAttemptedTokenRegistration.current = false;
      }
      
      previousUserRef.current = newUser;
      setUser(newUser);
      setIsLoading(false);
    });

    // Check if user is already logged in
    const currentUser = AuthService.getCurrentUser();
    console.log('🔐 AuthContext: Current user check:', currentUser ? `User ${currentUser.uid}` : 'No current user');
    if (currentUser) {
      setUser(currentUser);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }

    return unsubscribe;
  }, []);

  // Register token ONLY when both user is authenticated AND permissions are granted
  useEffect(() => {
    const registerToken = async () => {
      if (!user || !hasPermissions || hasAttemptedTokenRegistration.current) {
        return;
      }

      console.log('🔔 AuthContext: User authenticated AND permissions granted, registering FCM token');
      hasAttemptedTokenRegistration.current = true;

      // Get token first
      const token = await notificationService.getFCMToken();
      
      if (token) {
        // Then register it with the user
        await notificationService.registerTokenWithUser(user.uid);
      } else {
        console.warn('🔔 AuthContext: Failed to get FCM token, skipping registration');
      }
    };

    registerToken();
  }, [user, hasPermissions]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔐 AuthContext: State updated:', {
      user: user ? `User ${user.uid}` : 'No user',
      isLoading
    });
  }, [user, isLoading]);

  const signOut = async () => {
    try {
      // Remove FCM token before signing out
      if (user) {
        console.log('🔔 AuthContext: Signing out, removing FCM token');
        await notificationService.removeTokenFromUser(user.uid);
      }
      
      await AuthService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <NotificationPermissionsModal
        visible={showPermissionModal}
        onClose={skipPermissions}
        onPermissionGranted={requestPermissions}
      />
    </AuthContext.Provider>
  );
};
