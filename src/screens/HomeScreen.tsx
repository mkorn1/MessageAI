import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import MemberSelection from '../components/MemberSelection';
import { useAuth } from '../contexts/AuthContext';
import ChatService from '../services/chat';
import { User } from '../services/user';
import { Chat, ChatType } from '../types';


const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);


  // Load chats from Firestore
  const loadChats = useCallback(async () => {
    if (!user?.uid) {
      console.log('⚠️ No user UID available for loading chats');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('📱 Loading chats for user:', user.uid);
      
      const result = await ChatService.getUserChats(user.uid);
      
      if (result.success) {
        console.log('✅ Loaded chats:', result.data.length);
        console.log('📝 Chat data:', result.data.map(chat => ({
          id: chat.id,
          name: chat.name,
          type: chat.type,
          participants: chat.participants.length
        })));
        setChats(result.data);
      } else {
        console.error('❌ Failed to load chats:', result.error);
        
        // Show more specific error messages
        let errorMessage = 'Failed to load chats';
        if (result.error.code === 'failed-precondition') {
          errorMessage = 'Database index is being created. Please wait a moment and try again.';
        } else if (result.error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check your authentication.';
        } else if (result.error.code === 'unavailable') {
          errorMessage = 'Service temporarily unavailable. Please check your internet connection.';
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }
        
        Alert.alert('Error Loading Chats', errorMessage);
      }
    } catch (error) {
      console.error('💥 Error loading chats:', error);
      Alert.alert('Error', 'Failed to load chats. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Load chats on mount
  React.useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChats();
    setIsRefreshing(false);
  }, [loadChats]);

  // Handle member selection
  const handleMembersSelected = useCallback((members: User[]) => {
    setSelectedMembers(members);
    setShowMemberSelection(false);
    setShowCreateChat(true);
  }, []);

  // Handle member selection cancel
  const handleMemberSelectionCancel = useCallback(() => {
    setShowMemberSelection(false);
    setSelectedMembers([]);
  }, []);

  // Create new chat
  const handleCreateChat = useCallback(async () => {
    if (!newChatName.trim()) {
      Alert.alert('Error', 'Please enter a chat name');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to create a chat');
      return;
    }

    try {
      console.log('🏗️ Creating new chat:', newChatName.trim());
      
      // Include selected members in participants
      const participantIds = [user.uid, ...selectedMembers.map(member => member.uid)];
      
      const createChatData = {
        name: newChatName.trim(),
        type: ChatType.GROUP,
        participants: participantIds,
        createdBy: user.uid,
        allowMemberInvites: true,
        allowMemberMessages: true,
        allowFileSharing: true,
        isArchived: false,
        isMuted: false,
        notificationSettings: {
          soundEnabled: true,
          vibrationEnabled: true
        }
      };

      const result = await ChatService.createChat(createChatData);
      
      if (result.success) {
        console.log('✅ Chat created successfully:', result.data.id);
        setChats(prev => [result.data, ...prev]);
        setNewChatName('');
        setShowCreateChat(false);
        setSelectedMembers([]);
        
        // Navigate directly to chat window on success
        router.push(`/chat?chatId=${result.data.id}`);
      } else {
        console.error('❌ Failed to create chat:', result.error);
        Alert.alert('Error', 'Failed to create chat');
      }
    } catch (error) {
      console.error('💥 Error creating chat:', error);
      Alert.alert('Error', 'Failed to create chat');
    }
  }, [newChatName, user?.uid, selectedMembers, router]);

  // Enter chat
  const handleEnterChat = useCallback((chatId: string) => {
    router.push(`/chat?chatId=${chatId}`);
  }, [router]);

  // Sign out
  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  }, [signOut, router]);

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Handle delete chat
  const handleDeleteChat = useCallback(async (chatId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ChatService.deleteChat(chatId);
              
              if (result.success) {
                setChats(prev => prev.filter(chat => chat.id !== chatId));
                Alert.alert('Success', 'Chat deleted successfully');
              } else {
                console.error('Failed to delete chat:', result.error);
                Alert.alert('Error', 'Failed to delete chat');
              }
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat');
            }
          }
        }
      ]
    );
  }, []);

  // Swipeable Chat Item Component
  const SwipeableChatItem = ({ item }: { item: Chat }) => {
    const translateX = useSharedValue(0);
    const [isSwipeOpen, setIsSwipeOpen] = useState(false);

    const panGesture = Gesture.Pan()
      .onUpdate((event) => {
        // Only allow left swipe (negative translation)
        if (event.translationX < 0) {
          translateX.value = Math.max(event.translationX, -80);
        }
      })
      .onEnd((event) => {
        if (event.translationX < -40) {
          // Open delete action
          translateX.value = withSpring(-80);
          runOnJS(setIsSwipeOpen)(true);
        } else {
          // Close delete action
          translateX.value = withSpring(0);
          runOnJS(setIsSwipeOpen)(false);
        }
      });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value }],
      };
    });

    const deleteAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value + 80 }],
      };
    });

    const handlePress = () => {
      if (isSwipeOpen) {
        // Close swipe if open
        translateX.value = withSpring(0);
        setIsSwipeOpen(false);
      } else {
        // Enter chat
        handleEnterChat(item.id);
      }
    };

    const handleDelete = () => {
      translateX.value = withSpring(0);
      setIsSwipeOpen(false);
      handleDeleteChat(item.id);
    };

    // Get display name with fallback
    const getDisplayName = () => {
      if (item.name && item.name.trim()) {
        return item.name.trim();
      }
      if (item.type === 'direct') {
        return 'Direct Message';
      }
      return 'Group Chat';
    };

    const displayName = getDisplayName();
    const avatarText = displayName.charAt(0).toUpperCase();

    return (
      <View style={styles.swipeableContainer}>
        {/* Delete Action Background */}
        <Animated.View style={[styles.deleteAction, deleteAnimatedStyle]}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>🗑️</Text>
            <Text style={styles.deleteButtonLabel}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Chat Item */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={animatedStyle}>
            <TouchableOpacity
              style={styles.chatItem}
              onPress={handlePress}
            >
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>
                  {avatarText}
                </Text>
              </View>
              
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{displayName}</Text>
                  {item.lastMessage && (
                    <Text style={styles.chatTimestamp}>
                      {formatTimestamp(item.lastMessage.timestamp)}
                    </Text>
                  )}
                </View>
                
                <View style={styles.chatSubheader}>
                  <Text style={styles.participantCount}>
                    {item.participants?.length || 0} participants
                  </Text>
                </View>
                
                <View style={styles.chatFooter}>
                  <Text style={styles.chatLastMessage} numberOfLines={1}>
                    {item.lastMessage?.text || 'No messages yet'}
                  </Text>
                  {item.unreadCount && item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  };

  // Render chat item
  const renderChatItem = ({ item }: { item: Chat }) => {
    return <SwipeableChatItem item={item} />;
  };

  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>MessageAI</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {user?.displayName || user?.email || 'User'}
          </Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Create Chat Section */}
      {showCreateChat && (
        <View style={styles.createChatSection}>
          <TextInput
            style={styles.createChatInput}
            placeholder="Enter chat name"
            value={newChatName}
            onChangeText={setNewChatName}
            autoFocus
          />
          <View style={styles.createChatButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowCreateChat(false);
                setNewChatName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateChat}
            >
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Chats List */}
      <View style={styles.chatsContainer}>
        <View style={styles.chatsHeader}>
          <Text style={styles.chatsTitle}>Your Chats</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.testDataButton}
              onPress={() => router.push('/test-data')}
            >
              <Text style={styles.testDataButtonText}>Test Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={() => setShowMemberSelection(true)}
            >
              <Text style={styles.newChatButtonText}>+ New Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No chats yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first chat to start messaging!
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowMemberSelection(true)}
            >
              <Text style={styles.emptyStateButtonText}>Create Chat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
                tintColor="#007AFF"
              />
            }
          />
        )}
      </View>

      {/* Member Selection Modal */}
      {showMemberSelection && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MemberSelection
              onMembersSelected={handleMembersSelected}
              onCancel={handleMemberSelectionCancel}
            />
          </View>
        </View>
      )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createChatSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  createChatInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  createChatButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  chatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  chatsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  testDataButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF9500',
  },
  testDataButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  newChatButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  chatTimestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  chatSubheader: {
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  swipeableContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
    marginBottom: 4,
  },
  deleteButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default HomeScreen;
