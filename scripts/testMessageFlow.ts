import ChatService from '../src/services/chat';
import MessagingService from '../src/services/messaging';
import { ChatType, MessageStatus, MessageType } from '../src/types';

// Test the complete message sending flow
async function testMessageFlow() {
  try {
    console.log('🧪 Starting message flow test...');
    
    // Step 1: Create a test chat
    console.log('📝 Step 1: Creating test chat...');
    const createChatData = {
      name: 'Test Chat for Message Flow',
      type: ChatType.GROUP,
      participants: ['test-user-1', 'test-user-2'],
      createdBy: 'test-user-1',
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

    const chatResult = await ChatService.createChat(createChatData);
    
    if (!chatResult.success) {
      console.error('❌ Failed to create test chat:', chatResult.error);
      return;
    }
    
    console.log('✅ Test chat created:', chatResult.data.id);

    // Step 2: Send a test message
    console.log('📤 Step 2: Sending test message...');
    const messageData = {
      text: 'Hello! This is a test message to verify the flow works.',
      senderId: 'test-user-1',
      chatId: chatResult.data.id,
      messageType: MessageType.TEXT,
      timestamp: new Date(),
      status: MessageStatus.SENDING
    };

    const messageResult = await MessagingService.sendMessage(messageData);
    
    if (!messageResult.success) {
      console.error('❌ Failed to send test message:', messageResult.error);
      return;
    }
    
    console.log('✅ Test message sent:', messageResult.data.id);

    // Step 3: Verify message was stored
    console.log('🔍 Step 3: Verifying message was stored...');
    const messagesResult = await MessagingService.getMessages(chatResult.data.id);
    
    if (!messagesResult.success) {
      console.error('❌ Failed to retrieve messages:', messagesResult.error);
      return;
    }
    
    console.log('✅ Messages retrieved:', messagesResult.data.length);
    console.log('📝 Message content:', messagesResult.data[0]?.text);

    console.log('🎉 Message flow test completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Chat ID: ${chatResult.data.id}`);
    console.log(`   - Message ID: ${messageResult.data.id}`);
    console.log(`   - Messages in chat: ${messagesResult.data.length}`);

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Export for use in other files
export { testMessageFlow };

// Run test if this file is executed directly
if (require.main === module) {
  testMessageFlow();
}
