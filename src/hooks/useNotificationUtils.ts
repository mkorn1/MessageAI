import { useCallback } from 'react';
import {
    extractNotificationData,
    formatAPNSPayload,
    formatFCMPayload,
    formatNotificationForDisplay,
    formatNotificationPayload,
    FormattedNotification,
    generateNotificationId,
    NotificationPayload,
    NotificationValidationResult,
    sanitizeNotificationText,
    shouldGroupNotification,
    validateNotificationPayload,
} from '../utils/notificationUtils';

interface UseNotificationUtilsReturn {
  formatPayload: (
    senderName: string,
    messageText: string,
    chatName: string,
    chatType: 'direct' | 'group',
    chatId: string,
    messageId: string,
    senderId: string,
    participantCount?: number
  ) => NotificationPayload;
  
  formatForAPNS: (
    payload: NotificationPayload,
    threadId?: string,
    category?: string
  ) => any;
  
  formatForFCM: (
    payload: NotificationPayload,
    threadId?: string
  ) => any;
  
  validatePayload: (payload: NotificationPayload) => NotificationValidationResult;
  sanitizeText: (text: string) => string;
  generateId: (chatId: string, messageId: string) => string;
  shouldGroup: (currentChatId: string, previousChatId: string, timeDifference: number) => boolean;
  formatForDisplay: (payload: NotificationPayload) => FormattedNotification;
  extractData: (source: any) => any;
}

export const useNotificationUtils = (): UseNotificationUtilsReturn => {
  const formatPayload = useCallback((
    senderName: string,
    messageText: string,
    chatName: string,
    chatType: 'direct' | 'group',
    chatId: string,
    messageId: string,
    senderId: string,
    participantCount?: number
  ): NotificationPayload => {
    return formatNotificationPayload(
      senderName,
      messageText,
      chatName,
      chatType,
      chatId,
      messageId,
      senderId,
      participantCount
    );
  }, []);

  const formatForAPNS = useCallback((
    payload: NotificationPayload,
    threadId?: string,
    category?: string
  ): any => {
    return formatAPNSPayload(payload, threadId, category);
  }, []);

  const formatForFCM = useCallback((
    payload: NotificationPayload,
    threadId?: string
  ): any => {
    return formatFCMPayload(payload, threadId);
  }, []);

  const validatePayload = useCallback((payload: NotificationPayload): NotificationValidationResult => {
    return validateNotificationPayload(payload);
  }, []);

  const sanitizeText = useCallback((text: string): string => {
    return sanitizeNotificationText(text);
  }, []);

  const generateId = useCallback((chatId: string, messageId: string): string => {
    return generateNotificationId(chatId, messageId);
  }, []);

  const shouldGroup = useCallback((
    currentChatId: string,
    previousChatId: string,
    timeDifference: number
  ): boolean => {
    return shouldGroupNotification(currentChatId, previousChatId, timeDifference);
  }, []);

  const formatForDisplay = useCallback((payload: NotificationPayload): FormattedNotification => {
    return formatNotificationForDisplay(payload);
  }, []);

  const extractData = useCallback((source: any): any => {
    return extractNotificationData(source);
  }, []);

  return {
    formatPayload,
    formatForAPNS,
    formatForFCM,
    validatePayload,
    sanitizeText,
    generateId,
    shouldGroup,
    formatForDisplay,
    extractData,
  };
};

export default useNotificationUtils;
