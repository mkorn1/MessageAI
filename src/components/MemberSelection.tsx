import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import UserService, { User } from '../services/user';

interface MemberSelectionProps {
  onMembersSelected: (members: User[]) => void;
  onCancel: () => void;
  initialMembers?: User[];
}

const MemberSelection: React.FC<MemberSelectionProps> = ({
  onMembersSelected,
  onCancel,
  initialMembers = []
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>(initialMembers);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Load all users on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        const result = await UserService.getAllUsers();
        
        if (result.success) {
          setUsers(result.data);
          setFilteredUsers(result.data);
        } else {
          console.error('Failed to load users:', result.error);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleUserToggle = useCallback((user: User) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(member => member.uid === user.uid);
      if (isSelected) {
        return prev.filter(member => member.uid !== user.uid);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onMembersSelected(selectedMembers);
  }, [selectedMembers, onMembersSelected]);

  const isUserSelected = useCallback((user: User) => {
    return selectedMembers.some(member => member.uid === user.uid);
  }, [selectedMembers]);

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = isUserSelected(item);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => handleUserToggle(item)}
      >
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {item.displayName ? item.displayName.charAt(0).toUpperCase() : item.email.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.displayName || item.email}
          </Text>
          <Text style={styles.userEmail}>
            {item.email}
          </Text>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedMember = ({ item }: { item: User }) => (
    <View style={styles.selectedMemberChip}>
      <Text style={styles.selectedMemberText}>
        {item.displayName || item.email}
      </Text>
      <TouchableOpacity
        style={styles.removeMemberButton}
        onPress={() => handleUserToggle(item)}
      >
        <Text style={styles.removeMemberText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Members</Text>
        <TouchableOpacity
          style={[styles.confirmButton, selectedMembers.length === 0 && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={selectedMembers.length === 0}
        >
          <Text style={[styles.confirmButtonText, selectedMembers.length === 0 && styles.confirmButtonTextDisabled]}>
            Add ({selectedMembers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {/* Selected Members */}
      {selectedMembers.length > 0 && (
        <View style={styles.selectedMembersContainer}>
          <Text style={styles.selectedMembersTitle}>Selected Members:</Text>
          <FlatList
            data={selectedMembers}
            keyExtractor={(item) => item.uid}
            renderItem={renderSelectedMember}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedMembersList}
          />
        </View>
      )}

      {/* Users List */}
      <View style={styles.usersListContainer}>
        <Text style={styles.usersListTitle}>
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </Text>
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
          renderItem={renderUserItem}
          showsVerticalScrollIndicator={false}
          style={styles.usersList}
        />
      </View>
    </View>
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
    backgroundColor: '#F2F2F7',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  confirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  confirmButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: '#8E8E93',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F2F2F7',
  },
  selectedMembersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  selectedMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  selectedMembersList: {
    maxHeight: 40,
  },
  selectedMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedMemberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  removeMemberButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMemberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  usersListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  usersListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    paddingVertical: 12,
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
  },
  userItemSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MemberSelection;
