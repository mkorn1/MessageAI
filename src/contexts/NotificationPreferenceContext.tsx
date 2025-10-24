import React, { createContext, ReactNode, useContext } from 'react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { NotificationPreferenceContextType } from '../types/notificationPreferences';

const NotificationPreferenceContext = createContext<NotificationPreferenceContextType | undefined>(undefined);

interface NotificationPreferenceProviderProps {
  children: ReactNode;
}

export const NotificationPreferenceProvider: React.FC<NotificationPreferenceProviderProps> = ({ children }) => {
  const notificationPreferenceData = useNotificationPreferences();

  return (
    <NotificationPreferenceContext.Provider value={notificationPreferenceData}>
      {children}
    </NotificationPreferenceContext.Provider>
  );
};

export const useNotificationPreferenceContext = (): NotificationPreferenceContextType => {
  const context = useContext(NotificationPreferenceContext);
  if (context === undefined) {
    throw new Error('useNotificationPreferenceContext must be used within a NotificationPreferenceProvider');
  }
  return context;
};

export default NotificationPreferenceProvider;
