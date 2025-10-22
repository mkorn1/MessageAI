import React, { createContext, useContext, useEffect, useState } from 'react';
import AuthService, { User } from '../services/auth';

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

  useEffect(() => {
    console.log('🔐 AuthContext: Setting up auth state listener');
    
    // Listen to authentication state changes
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      console.log('🔐 AuthContext: Auth state changed:', user ? `User ${user.uid}` : 'No user');
      setUser(user);
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

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔐 AuthContext: State updated:', {
      user: user ? `User ${user.uid}` : 'No user',
      isLoading
    });
  }, [user, isLoading]);

  const signOut = async () => {
    try {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
