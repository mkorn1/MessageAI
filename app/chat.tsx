import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import ChatScreen from '../src/screens/ChatScreen';

export default function ChatRoute() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  
  // Use a default test chat ID if none provided
  const testChatId = chatId || 'test-chat-123';
  
  return (
    <ChatScreen 
      chatId={testChatId}
      onBack={() => {
        // Use Expo Router to navigate back
        router.back();
      }}
    />
  );
}
