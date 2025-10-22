import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ChatService from '../services/chat';
import UserService from '../services/user';
import { Chat } from '../types';

interface ChatSettingsScreenProps {
  chat: Chat;
  onBack: () => void;
  onChatDeleted: () => void;
  onMembersAdded: (newMembers: string[]) => void;
}

const ChatSettingsScreen: React.FC<ChatSettingsScreenProps> = ({
  chat,
  onBack,
  onChatDeleted,
  onMembersAdded
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showRenameChat, setShowRenameChat] = useState(false);
  const [newChatName, setNewChatName] = useState(chat.name || '');

  // Handle rename chat
  const handleRenameChat = useCallback(async () => {
    if (!newChatName.trim()) {
      Alert.alert('Error', 'Please enter a chat name');
      return;
    }

    try {
      setIsLoading(true);
      const result = await ChatService.updateChatName(chat.id, newChatName.trim());
      
      if (result.success) {
        Alert.alert('Success', 'Chat name updated successfully');
        setShowRenameChat(false);
        // The chat name will be updated in the parent component through real-time listeners
      } else {
        Alert.alert('Error', 'Failed to update chat name');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update chat name');
    } finally {
      setIsLoading(false);
    }
  }, [chat.id, newChatName]);

  // Handle delete chat
  const handleDeleteChat = useCallback(async () => {
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
              setIsLoading(true);
              const result = await ChatService.deleteChat(chat.id);
              
              if (result.success) {
                onChatDeleted();
                Alert.alert('Success', 'Chat deleted successfully');
              } else {
                console.error('Failed to delete chat:', result.error);
                Alert.alert('Error', 'Failed to delete chat');
              }
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  }, [chat.id, onChatDeleted]);

  // Handle add member
  const handleAddMember = useCallback(async () => {
    if (!newMemberEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      setIsLoading(true);
      
      // First, find the user by email
      const userResult = await UserService.getUserByEmail(newMemberEmail.trim());
      
      if (!userResult.success || !userResult.data) {
        Alert.alert('Error', 'User not found with this email address');
        return;
      }

      const userToAdd = userResult.data;
      
      // Add the user to the chat
      const addResult = await ChatService.addMembers(chat.id, [userToAdd.uid]);
      
      if (addResult.success) {
        onMembersAdded([userToAdd.uid]);
        setNewMemberEmail('');
        setShowAddMembers(false);
        Alert.alert('Success', 'Member added successfully');
      } else {
        console.error('Failed to add member:', addResult.error);
        Alert.alert('Error', 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Error', 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  }, [newMemberEmail, chat.id, onMembersAdded]);

  // Render member item
  const renderMemberItem = ({ item }: { item: string }) => {
    const isCurrentUser = item === user?.uid;
    
    return (
      <View style={styles.memberItem}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {isCurrentUser ? 'You' : item.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {isCurrentUser ? 'You' : item}
          </Text>
          <Text style={styles.memberEmail}>
            {isCurrentUser ? user?.email || 'Current user' : item}
          </Text>
        </View>
        {!isCurrentUser && (
          <TouchableOpacity style={styles.removeMemberButton}>
            <Text style={styles.removeMemberText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Chat Info */}
      <View style={styles.chatInfoSection}>
        <Text style={styles.sectionTitle}>Chat Information</Text>
        <View style={styles.chatInfoItem}>
          <Text style={styles.chatInfoLabel}>Name:</Text>
          <View style={styles.chatNameContainer}>
            <Text style={styles.chatInfoValue}>{chat.name || 'Unnamed Chat'}</Text>
            <TouchableOpacity
              style={styles.renameButton}
              onPress={() => setShowRenameChat(true)}
            >
              <Text style={styles.renameButtonText}>Rename</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.chatInfoItem}>
          <Text style={styles.chatInfoLabel}>Type:</Text>
          <Text style={styles.chatInfoValue}>
            {chat.type === 'direct' ? 'Direct Message' : 'Group Chat'}
          </Text>
        </View>
        <View style={styles.chatInfoItem}>
          <Text style={styles.chatInfoLabel}>Members:</Text>
          <Text style={styles.chatInfoValue}>{chat.participants.length}</Text>
        </View>
      </View>

      {/* Rename Chat Section */}
      {showRenameChat && (
        <View style={styles.renameSection}>
          <Text style={styles.sectionTitle}>Rename Chat</Text>
          <TextInput
            style={styles.renameInput}
            placeholder="Enter new chat name"
            value={newChatName}
            onChangeText={setNewChatName}
            autoFocus
          />
          <View style={styles.renameButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowRenameChat(false);
                setNewChatName(chat.name || '');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleRenameChat}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Members Section */}
      <View style={styles.membersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members</Text>
          <TouchableOpacity
            style={styles.addMemberButton}
            onPress={() => setShowAddMembers(true)}
          >
            <Text style={styles.addMemberButtonText}>+ Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Add Member Input */}
        {showAddMembers && (
          <View style={styles.addMemberSection}>
            <TextInput
              style={styles.addMemberInput}
              placeholder="Enter email address"
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.addMemberButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddMembers(false);
                  setNewMemberEmail('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddMember}
                disabled={isLoading}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Members List */}
        <FlatList
          data={chat.participants}
          keyExtractor={(item) => item}
          renderItem={renderMemberItem}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.deleteChatButton}
          onPress={handleDeleteChat}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.deleteChatButtonText}>Delete Chat</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  chatInfoSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  chatInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chatInfoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  chatInfoValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '400',
  },
  chatNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  renameButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  renameButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  renameSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  renameButtons: {
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  membersSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMemberButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  addMemberButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addMemberSection: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  addMemberInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  addMemberButtons: {
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
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  removeMemberButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  removeMemberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  deleteChatButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatSettingsScreen;
