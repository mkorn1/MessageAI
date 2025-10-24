import React, { createContext, ReactNode, useContext, useEffect } from 'react';
import { useActiveChat } from '../hooks/useActiveChat';
import activeChatService from '../services/activeChatService';

interface ActiveChatContextType {
  activeChatId: string | null;
  isInChat: boolean;
  isInSpecificChat: (chatId: string) => boolean;
}

const ActiveChatContext = createContext<ActiveChatContextType | undefined>(undefined);

interface ActiveChatProviderProps {
  children: ReactNode;
}

export const ActiveChatProvider: React.FC<ActiveChatProviderProps> = ({ children }) => {
  const activeChatData = useActiveChat();

  // Update the service when active chat changes
  useEffect(() => {
    activeChatService.updateActiveChat(activeChatData.activeChatId);
  }, [activeChatData.activeChatId]);

  return (
    <ActiveChatContext.Provider value={activeChatData}>
      {children}
    </ActiveChatContext.Provider>
  );
};

export const useActiveChatContext = (): ActiveChatContextType => {
  const context = useContext(ActiveChatContext);
  if (context === undefined) {
    throw new Error('useActiveChatContext must be used within an ActiveChatProvider');
  }
  return context;
};

export default ActiveChatProvider;
