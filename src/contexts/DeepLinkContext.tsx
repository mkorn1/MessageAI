import React, { createContext, ReactNode, useContext } from 'react';
import { useDeepLink } from '../hooks/useDeepLink';
import { DeepLinkData } from '../services/deepLinkService';

interface DeepLinkContextType {
  deepLinkData: DeepLinkData | null;
  isProcessing: boolean;
  generateChatDeepLink: (chatId: string, options?: {
    messageId?: string;
    senderId?: string;
    chatName?: string;
    chatType?: 'direct' | 'group';
    messageText?: string;
  }) => string;
  generateNotificationDeepLink: (data: {
    chatId: string;
    messageId?: string;
    senderId?: string;
    chatName?: string;
    chatType?: 'direct' | 'group';
    messageText?: string;
  }) => string;
  processDeepLink: (url: string) => DeepLinkData;
  addListener: (listener: (data: DeepLinkData) => void) => () => void;
}

const DeepLinkContext = createContext<DeepLinkContextType | undefined>(undefined);

interface DeepLinkProviderProps {
  children: ReactNode;
}

export const DeepLinkProvider: React.FC<DeepLinkProviderProps> = ({ children }) => {
  const deepLink = useDeepLink();

  return (
    <DeepLinkContext.Provider value={deepLink}>
      {children}
    </DeepLinkContext.Provider>
  );
};

export const useDeepLinkContext = (): DeepLinkContextType => {
  const context = useContext(DeepLinkContext);
  if (context === undefined) {
    throw new Error('useDeepLinkContext must be used within a DeepLinkProvider');
  }
  return context;
};

export default DeepLinkProvider;
