import { useCallback, useEffect, useState } from 'react';
import deepLinkService, { DeepLinkData } from '../services/deepLinkService';

interface UseDeepLinkReturn {
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

export const useDeepLink = (): UseDeepLinkReturn => {
  const [deepLinkData, setDeepLinkData] = useState<DeepLinkData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeepLinkData = useCallback((data: DeepLinkData) => {
    console.log('🔗 useDeepLink: Received deep link data:', data);
    setDeepLinkData(data);
    setIsProcessing(false);
  }, []);

  const generateChatDeepLink = useCallback((
    chatId: string, 
    options?: {
      messageId?: string;
      senderId?: string;
      chatName?: string;
      chatType?: 'direct' | 'group';
      messageText?: string;
    }
  ) => {
    return deepLinkService.generateChatDeepLink(chatId, options);
  }, []);

  const generateNotificationDeepLink = useCallback((data: {
    chatId: string;
    messageId?: string;
    senderId?: string;
    chatName?: string;
    chatType?: 'direct' | 'group';
    messageText?: string;
  }) => {
    return deepLinkService.generateNotificationDeepLink(data);
  }, []);

  const processDeepLink = useCallback((url: string): DeepLinkData => {
    setIsProcessing(true);
    return deepLinkService.processDeepLink(url);
  }, []);

  const addListener = useCallback((listener: (data: DeepLinkData) => void) => {
    return deepLinkService.addListener(listener);
  }, []);

  useEffect(() => {
    // Add listener for deep link events
    const unsubscribe = deepLinkService.addListener(handleDeepLinkData);

    return () => {
      unsubscribe();
    };
  }, [handleDeepLinkData]);

  return {
    deepLinkData,
    isProcessing,
    generateChatDeepLink,
    generateNotificationDeepLink,
    processDeepLink,
    addListener,
  };
};

export default useDeepLink;
