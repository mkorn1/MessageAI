import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import ChatScreen from '../src/screens/ChatScreen';

export default function ChatRoute() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  
  // Use a default test chat ID if none provided
  const testChatId = chatId || 'test-chat-123';
  
  // Swipe gesture values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  
  const handleBack = () => {
    router.back();
  };
  
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
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <ChatScreen 
            chatId={testChatId}
            onBack={handleBack}
          />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
