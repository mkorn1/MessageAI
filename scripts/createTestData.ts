import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Create test chat and messages
async function createTestData() {
  try {
    console.log('Creating test chat and messages...');

    // Create test chat
    const chatId = 'test-chat-123';
    const chatRef = doc(db, 'chats', chatId);
    
    await setDoc(chatRef, {
      id: chatId,
      name: 'Test Chat',
      type: 'direct',
      participants: ['test-user-1', 'test-user-2'],
      createdBy: 'test-user-1',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Test chat created');

    // Create test messages
    const messagesRef = collection(db, 'messages');
    
    const testMessages = [
      {
        text: 'Hello! This is a test message.',
        senderId: 'test-user-1',
        chatId: chatId,
        messageType: 'text',
        status: 'sent',
        timestamp: serverTimestamp(),
      },
      {
        text: 'Hi there! How are you doing?',
        senderId: 'test-user-2',
        chatId: chatId,
        messageType: 'text',
        status: 'sent',
        timestamp: serverTimestamp(),
      },
      {
        text: 'I\'m doing great! Thanks for asking.',
        senderId: 'test-user-1',
        chatId: chatId,
        messageType: 'text',
        status: 'sent',
        timestamp: serverTimestamp(),
      },
    ];

    for (const message of testMessages) {
      await addDoc(messagesRef, message);
    }

    console.log('✅ Test messages created');
    console.log('Test data setup complete!');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

// Export for use in other files
export { createTestData };

// Run if this file is executed directly
if (typeof window !== 'undefined') {
  // Make it available globally for testing
  (window as any).createTestData = createTestData;
}
