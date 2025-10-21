import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import ChatSettingsScreen from '../src/screens/ChatSettingsScreen';
import ChatService from '../src/services/chat';
import { Chat } from '../src/types';

export default function ChatSettingsRoute() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Swipe gesture values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Load chat data
  useEffect(() => {
    const loadChat = async () => {
      if (!chatId) {
        router.back();
        return;
      }

      try {
        setIsLoading(true);
        const result = await ChatService.getChat(chatId);
        
        if (result.success) {
          setChat(result.data);
        } else {
          console.error('Failed to load chat:', result.error);
          router.back();
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    loadChat();
  }, [chatId, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow right swipe (positive translation)
      if (event.translationX > 0) {
        translateX.value = event.translationX;
        // Reduce opacity as we swipe
        opacity.value = Math.max(0.3, 1 - event.translationX / 200);
      }
    })
    .onEnd((event) => {
      // If swipe distance is significant, trigger back navigation
      if (event.translationX > 100) {
        runOnJS(handleBack)();
      } else {
        // Spring back to original position
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  const handleChatDeleted = useCallback(() => {
    // Navigate back to home screen after chat deletion
    router.replace('/');
  }, [router]);

  const handleMembersAdded = useCallback((newMembers: string[]) => {
    // Refresh chat data to show new members
    if (chat) {
      setChat(prev => prev ? {
        ...prev,
        participants: [...prev.participants, ...newMembers]
      } : null);
    }
  }, [chat]);

  if (isLoading || !chat) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Could show loading screen here */}
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <ChatSettingsScreen
            chat={chat}
            onBack={handleBack}
            onChatDeleted={handleChatDeleted}
            onMembersAdded={handleMembersAdded}
          />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
