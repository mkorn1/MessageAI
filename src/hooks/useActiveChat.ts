import { usePathname, useSegments } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

interface UseActiveChatReturn {
  activeChatId: string | null;
  isInChat: boolean;
  isInSpecificChat: (chatId: string) => boolean;
}

export const useActiveChat = (): UseActiveChatReturn => {
  const pathname = usePathname();
  const segments = useSegments();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Extract chat ID from current route
  const extractChatId = useCallback((path: string, segments: string[]): string | null => {
    try {
      // Check if we're in a chat route
      // Expected patterns: /chat/[chatId] or /(tabs)/chat/[chatId]
      const chatIndex = segments.findIndex(segment => segment === 'chat');
      
      if (chatIndex !== -1 && chatIndex + 1 < segments.length) {
        const chatId = segments[chatIndex + 1];
        
        // Validate that it looks like a chat ID (not a special route)
        if (chatId && !['index', 'new', 'settings'].includes(chatId)) {
          return chatId;
        }
      }
      
      // Fallback: try to extract from pathname using regex
      const chatMatch = path.match(/\/chat\/([^\/\?]+)/);
      if (chatMatch && chatMatch[1]) {
        return chatMatch[1];
      }
      
      return null;
    } catch (error) {
      console.error('🔔 useActiveChat: Error extracting chat ID:', error);
      return null;
    }
  }, []);

  // Update active chat ID when route changes
  useEffect(() => {
    const chatId = extractChatId(pathname, segments);
    console.log('🔔 useActiveChat: Route changed:', { pathname, segments, chatId });
    setActiveChatId(chatId);
  }, [pathname, segments, extractChatId]);

  // Check if user is currently in any chat
  const isInChat = activeChatId !== null;

  // Check if user is in a specific chat
  const isInSpecificChat = useCallback((chatId: string): boolean => {
    return activeChatId === chatId;
  }, [activeChatId]);

  return {
    activeChatId,
    isInChat,
    isInSpecificChat,
  };
};

export default useActiveChat;
