#!/usr/bin/env ts-node

import n8nWebhookService from '../src/services/n8nWebhookService';
import { Message, MessageType } from '../src/types/message';

/**
 * Test script to send a test event to the n8n webhook
 * This creates sample data and sends it to the webhook for testing
 */

async function testN8nWebhook() {
  console.log('🧪 Starting n8n webhook test...\n');

  try {
    // Create test message
    const testMessage: Message = {
      id: 'test-message-' + Date.now(),
      text: 'Hey team, let\'s schedule a meeting for tomorrow at 2pm to discuss the project updates. Can everyone make it?',
      senderId: 'test-user-123',
      chatId: 'test-chat-456',
      timestamp: new Date(),
      messageType: MessageType.TEXT
    };

    // Create test chat context (previous messages)
    const testChatContext: Message[] = [
      {
        id: 'context-msg-1',
        text: 'Good morning everyone!',
        senderId: 'test-user-456',
        chatId: 'test-chat-456',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        messageType: MessageType.TEXT
      },
      {
        id: 'context-msg-2',
        text: 'Morning! How\'s the project going?',
        senderId: 'test-user-789',
        chatId: 'test-chat-456',
        timestamp: new Date(Date.now() - 180000), // 3 minutes ago
        messageType: MessageType.TEXT
      }
    ];

    const testUserId = 'test-user-123';

    console.log('📤 Test Data:');
    console.log('  Message:', testMessage.text);
    console.log('  User ID:', testUserId);
    console.log('  Chat Context Messages:', testChatContext.length);
    console.log('  Webhook URL:', n8nWebhookService.getConfig().analysisWebhookUrl);
    console.log('');

    // Send the test request
    console.log('🚀 Sending test request to n8n webhook...');
    const result = await n8nWebhookService.sendMessageAnalysis(
      testMessage,
      testChatContext,
      testUserId
    );

    if (result.success) {
      console.log('✅ Test successful!');
      console.log('📥 Response received:');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Test failed:');
      console.log('  Error:', result.error.message);
      console.log('  Retryable:', result.retryable);
    }

  } catch (error: any) {
    console.error('💥 Unexpected error during test:');
    console.error(error.message);
    console.error(error.stack);
  }

  console.log('\n🏁 Test completed.');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testN8nWebhook()
    .then(() => {
      console.log('✨ Test script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testN8nWebhook };
