import React, { useCallback, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { MessageType } from '../types';

interface MessageInputProps {
  onSendMessage: (text: string, messageType?: MessageType) => void;
  onAttachMedia?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showAttachButton?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onAttachMedia,
  placeholder = "Type a message...",
  disabled = false,
  maxLength = 4000,
  showAttachButton = true
}) => {
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const expandAnimation = useRef(new Animated.Value(0)).current;

  const { width: screenWidth } = Dimensions.get('window');
  const maxInputWidth = screenWidth - 120; // Account for buttons and padding

  // Handle text change with character limit
  const handleTextChange = useCallback((text: string) => {
    if (text.length <= maxLength) {
      setMessage(text);
      
      // Auto-expand input for longer messages
      const shouldExpand = text.length > 50;
      if (shouldExpand !== isExpanded) {
        setIsExpanded(shouldExpand);
        Animated.timing(expandAnimation, {
          toValue: shouldExpand ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [maxLength, isExpanded, expandAnimation]);

  // Handle send message
  const handleSend = useCallback(() => {
    console.log('🔘 Send button pressed!');
    const trimmedMessage = message.trim();
    console.log('📝 Message text:', trimmedMessage);
    
    if (trimmedMessage.length === 0) {
      console.log('❌ Message is empty, not sending');
      return;
    }

    if (trimmedMessage.length > maxLength) {
      console.log('❌ Message too long:', trimmedMessage.length, 'max:', maxLength);
      Alert.alert('Message too long', `Message must be ${maxLength} characters or less.`);
      return;
    }

    console.log('✅ Calling onSendMessage with:', trimmedMessage);
    onSendMessage(trimmedMessage, MessageType.TEXT);
    setMessage('');
    setIsExpanded(false);
    
    Animated.timing(expandAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [message, maxLength, onSendMessage, expandAnimation]);

  // Handle attach media
  const handleAttachMedia = useCallback(() => {
    if (onAttachMedia) {
      onAttachMedia();
    } else {
      Alert.alert('Media attachment', 'Media attachment feature coming soon!');
    }
  }, [onAttachMedia]);

  // Handle keyboard submit
  const handleSubmitEditing = useCallback(() => {
    handleSend();
  }, [handleSend]);

  // Focus input
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Calculate input height based on content
  const inputHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 80],
  });

  const canSend = message.trim().length > 0 && !disabled;
  const remainingChars = maxLength - message.length;
  const showCharCount = message.length > maxLength * 0.8; // Show when 80% full
  
  // Debug logging
  console.log('🔍 MessageInput state:', { 
    message: message, 
    messageLength: message.length, 
    trimmedLength: message.trim().length,
    disabled: disabled,
    canSend: canSend 
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inputContainer}>
        {/* Attach button */}
        {showAttachButton && (
          <TouchableOpacity
            style={[styles.attachButton, disabled && styles.disabledButton]}
            onPress={handleAttachMedia}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={[styles.attachButtonText, disabled && styles.disabledText]}>
              📎
            </Text>
          </TouchableOpacity>
        )}

        {/* Text input container */}
        <View style={styles.inputWrapper}>
          <Animated.View style={[styles.inputContainer, { height: inputHeight }]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                isExpanded && styles.textInputExpanded,
                disabled && styles.disabledInput
              ]}
              value={message}
              onChangeText={handleTextChange}
              placeholder={placeholder}
              placeholderTextColor="#999"
              multiline
              maxLength={maxLength}
              editable={!disabled}
              onSubmitEditing={handleSubmitEditing}
              returnKeyType="send"
              blurOnSubmit={false}
              textAlignVertical="center"
            />
          </Animated.View>

          {/* Character count */}
          {showCharCount && (
            <Text style={[
              styles.charCount,
              remainingChars < 0 && styles.charCountError
            ]}>
              {remainingChars}
            </Text>
          )}
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonInactive,
            disabled && styles.disabledButton
          ]}
          onPress={() => {
            console.log('🔘 TouchableOpacity onPress triggered!');
            handleSend();
          }}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.sendButtonText,
            canSend ? styles.sendButtonTextActive : styles.sendButtonTextInactive,
            disabled && styles.disabledText
          ]}>
            ↑
          </Text>
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F7',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    paddingBottom: Platform.OS === 'ios' ? 34 : 8, // Account for home indicator
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  attachButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attachButtonText: {
    fontSize: 16,
    opacity: 0.7,
  },
  inputWrapper: {
    flex: 1,
    marginRight: 8,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1C1E',
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 22,
    maxHeight: 100,
    fontWeight: '400',
  },
  textInputExpanded: {
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 2,
    opacity: 0.6,
  },
  charCountError: {
    color: '#FF3B30',
    opacity: 1,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: '#E5E5EA',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonTextActive: {
    color: '#FFFFFF',
  },
  sendButtonTextInactive: {
    color: '#8E8E93',
  },
  disabledButton: {
    backgroundColor: '#F2F2F7',
  },
  disabledInput: {
    color: '#8E8E93',
  },
  disabledText: {
    color: '#8E8E93',
  },
  focusArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});

export default MessageInput;
