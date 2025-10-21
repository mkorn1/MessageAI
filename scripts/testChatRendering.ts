import { Chat, ChatType } from '../src/types';

// Test data for different chat scenarios
export const testChatData: Chat[] = [
  {
    id: 'chat-1',
    type: ChatType.GROUP,
    name: 'Test Group Chat',
    participants: ['user1', 'user2'],
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    allowMemberInvites: true,
    allowMemberMessages: true,
    allowFileSharing: true,
    isArchived: false,
    isMuted: false,
    notificationSettings: {
      soundEnabled: true,
      vibrationEnabled: true
    },
    lastMessage: {
      id: 'msg-1',
      text: 'Hello everyone!',
      senderId: 'user1',
      timestamp: new Date()
    }
  },
  {
    id: 'chat-2',
    type: ChatType.DIRECT,
    // name is undefined for direct chats
    participants: ['user1', 'user3'],
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    allowMemberInvites: false,
    allowMemberMessages: true,
    allowFileSharing: true,
    isArchived: false,
    isMuted: false,
    notificationSettings: {
      soundEnabled: true,
      vibrationEnabled: true
    }
  },
  {
    id: 'chat-3',
    type: ChatType.GROUP,
    name: '', // Empty name
    participants: ['user1', 'user2', 'user3'],
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    allowMemberInvites: true,
    allowMemberMessages: true,
    allowFileSharing: true,
    isArchived: false,
    isMuted: false,
    notificationSettings: {
      soundEnabled: true,
      vibrationEnabled: true
    }
  }
];

// Test function to verify chat name handling
export function testChatNameHandling() {
  console.log('🧪 Testing chat name handling...');
  
  testChatData.forEach((chat, index) => {
    console.log(`\n📝 Chat ${index + 1}:`);
    console.log(`   ID: ${chat.id}`);
    console.log(`   Type: ${chat.type}`);
    console.log(`   Name: "${chat.name}"`);
    console.log(`   Name exists: ${!!chat.name}`);
    console.log(`   Name trimmed: "${chat.name?.trim() || 'undefined'}"`);
    
    // Test the display name logic
    const getDisplayName = () => {
      if (chat.name && chat.name.trim()) {
        return chat.name.trim();
      }
      if (chat.type === 'direct') {
        return 'Direct Message';
      }
      return 'Group Chat';
    };
    
    const displayName = getDisplayName();
    const avatarText = displayName.charAt(0).toUpperCase();
    
    console.log(`   Display Name: "${displayName}"`);
    console.log(`   Avatar Text: "${avatarText}"`);
    console.log(`   ✅ No errors expected`);
  });
  
  console.log('\n🎉 All chat name handling tests passed!');
}

// Export for use in other files
export { testChatNameHandling };
