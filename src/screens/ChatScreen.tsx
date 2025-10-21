import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MessageInput from '../components/MessageInput';
import MessageList from '../components/MessageList';
import useMessages from '../hooks/useMessages';
import AuthService from '../services/auth';
import ChatService from '../services/chat';
import { Chat, Message, MessageType } from '../types';

interface ChatScreenProps {
  chatId: string;
  chat?: Chat;
  onBack?: () => void;
  onChatSettings?: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({
  chatId,
  chat,
  onBack,
  onChatSettings
}) => {
  const router = useRouter();
  const [chatData, setChatData] = useState<Chat | null>(chat || null);
  const [isLoadingChat, setIsLoadingChat] = useState(!chat);

  // Load chat data if not provided
  useEffect(() => {
    const loadChatData = async () => {
      if (chat) {
        setChatData(chat);
        return;
      }

      try {
        setIsLoadingChat(true);
        console.log('🔍 Loading chat data for chatId:', chatId);
        
        const result = await ChatService.getChat(chatId);
        
        if (result.success) {
          console.log('✅ Chat data loaded:', result.data);
          setChatData(result.data);
        } else {
          console.error('❌ Failed to load chat data:', result.error);
        }
      } catch (error) {
        console.error('💥 Error loading chat data:', error);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadChatData();
  }, [chatId, chat]);

  // Debug: Log the chatId being received
  React.useEffect(() => {
    console.log('🔍 ChatScreen received chatId:', chatId);
    console.log('🔍 ChatScreen received chat object:', chat);
    console.log('🔍 ChatScreen chatData state:', chatData);
  }, [chatId, chat, chatData]);

  // Use the custom hook for message management
  const {
    messages,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMoreMessages,
    error,
    connectionError,
    sendMessage,
    refreshMessages,
    loadMoreMessages,
    retryFailedMessage,
    editMessage,
    deleteMessage,
    clearError,
    getMessageById
  } = useMessages({
    chatId,
    enableRealTime: true,
    batchSize: 50,
    onError: (error) => {
      console.error('Message error:', error);
    }
  });

  // Handle sending a message
  const handleSendMessage = useCallback(async (text: string, messageType: MessageType = MessageType.TEXT) => {
    console.log('📱 ChatScreen.handleSendMessage called with:', { text, messageType });
    await sendMessage(text, messageType);
  }, [sendMessage]);

  // Handle refreshing messages
  const handleRefresh = useCallback(async () => {
    await refreshMessages();
  }, [refreshMessages]);

  // Handle loading more messages
  const handleLoadMore = useCallback(async () => {
    await loadMoreMessages();
  }, [loadMoreMessages]);

  // Handle message press
  const handleMessagePress = useCallback((message: Message) => {
    // Future: Show message details, reply, etc.
    console.log('Message pressed:', message.id);
  }, []);

  // Handle message long press
  const handleMessageLongPress = useCallback((message: Message) => {
    const currentUser = getMessageById(message.id)?.senderId;
    if (message.senderId === currentUser) {
      Alert.alert(
        'Message Options',
        'What would you like to do?',
        [
          { 
            text: 'Edit', 
            onPress: () => {
              Alert.prompt(
                'Edit Message',
                'Enter new text:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Save', 
                    onPress: (newText) => {
                      if (newText && newText.trim()) {
                        editMessage(message.id, newText.trim());
                      }
                    }
                  }
                ],
                'plain-text',
                message.text
              );
            }
          },
          { 
            text: 'Delete', 
            onPress: () => {
              Alert.alert(
                'Delete Message',
                'Are you sure you want to delete this message?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => deleteMessage(message.id)
                  }
                ]
              );
            }, 
            style: 'destructive' 
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  }, [getMessageById, editMessage, deleteMessage]);

  // Handle attach media
  const handleAttachMedia = useCallback(() => {
    Alert.alert(
      'Attach Media',
      'Choose media type',
      [
        { text: 'Camera', onPress: () => console.log('Open camera') },
        { text: 'Photo Library', onPress: () => console.log('Open photo library') },
        { text: 'File', onPress: () => console.log('Open file picker') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, []);

  // Handle retry failed message
  const handleRetryMessage = useCallback((messageId: string) => {
    retryFailedMessage(messageId);
  }, [retryFailedMessage]);

  // Get chat display name
  const getChatDisplayName = useCallback(() => {
    if (chatData?.name) return chatData.name;
    if (chatData?.type === 'direct') return 'Direct Message';
    return 'Group Chat';
  }, [chatData]);

  // Error state
  if (error && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={clearError}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.chatName}>{getChatDisplayName()}</Text>
          <Text style={styles.participantCount}>
            {chatData?.participants?.length || 0} participants
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => {
            if (onChatSettings) {
              onChatSettings();
            } else {
              // Default behavior - navigate to chat settings
              router.push(`/chat-settings?chatId=${chatId}`);
            }
          }}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Chat content */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={AuthService.getCurrentUser()?.uid || ''}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            onMessagePress={handleMessagePress}
            onMessageLongPress={handleMessageLongPress}
            hasMoreMessages={hasMoreMessages}
          />
        )}

        {/* Message input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onAttachMedia={handleAttachMedia}
          disabled={isLoading}
          placeholder="Type a message..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '400',
  },
  headerInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  participantCount: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
    fontWeight: '400',
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  settingsButtonText: {
    fontSize: 18,
    opacity: 0.7,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '400',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F2F2F7',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '400',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;
