#!/usr/bin/env node

/**
 * Simple test script to send a test event to the n8n webhook
 * This uses direct HTTP requests without TypeScript dependencies
 */

const webhookUrl = 'https://mkorn1.app.n8n.cloud/webhook/cfb3bef3-f299-4f85-8eb4-cb350dbbb810';

// Configuration
const CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  quiet: process.argv.includes('--quiet') || process.argv.includes('-q'),
};

async function testN8nWebhook() {
  if (!CONFIG.quiet) {
    console.log('Starting n8n webhook test...\n');
  }

  try {
    // Create test payload matching the expected format
    const testPayload = {
      message: {
        id: 'test-message-' + Date.now(),
        text: 'Hey team, let\'s schedule a meeting for tomorrow at 2pm to discuss the project updates. Can everyone make it?',
        senderId: 'test-user-123',
        chatId: 'test-chat-456',
        timestamp: new Date().toISOString(),
        messageType: 'text'
      },
      chatContext: [
        {
          id: 'context-msg-1',
          text: 'Good morning everyone!',
          senderId: 'test-user-456',
          chatId: 'test-chat-456',
          timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
        },
        {
          id: 'context-msg-2',
          text: 'Morning! How\'s the project going?',
          senderId: 'test-user-789',
          chatId: 'test-chat-456',
          timestamp: new Date(Date.now() - 180000).toISOString() // 3 minutes ago
        }
      ],
      userId: 'test-user-123'
    };

    if (CONFIG.verbose) {
      console.log('Test Data:');
      console.log('  Message:', testPayload.message.text);
      console.log('  User ID:', testPayload.userId);
      console.log('  Chat Context Messages:', testPayload.chatContext.length);
      console.log('  Webhook URL:', webhookUrl);
      console.log('');
    }

    // First, activate the webhook with GET request
    if (CONFIG.verbose) {
      console.log('Activating webhook with GET request...');
    }
    const activationResponse = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (CONFIG.verbose) {
      console.log('Activation Response:', activationResponse.status, activationResponse.statusText);
    }
    
    if (activationResponse.ok) {
      const activationData = await activationResponse.json();
      if (CONFIG.verbose) {
        console.log('Webhook activated:', activationData);
      }
    }

    // Now send the POST request with data
    if (CONFIG.verbose) {
      console.log('Sending POST request with data payload...');
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (CONFIG.verbose) {
      console.log('Response Status:', response.status, response.statusText);
    }

    if (response.ok) {
      const responseData = await response.json();
      if (CONFIG.quiet) {
        console.log('Test successful - Status:', response.status);
      } else {
        console.log('Test successful!');
        console.log('Response received:');
        console.log(JSON.stringify(responseData, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('Test failed:');
      console.log('  Status:', response.status);
      console.log('  Error:', errorText);
    }

  } catch (error) {
    console.error('Unexpected error during test:');
    console.error(error.message);
  }

  if (!CONFIG.quiet) {
    console.log('\nTest completed.');
  }
}

// Run the test
testN8nWebhook()
  .then(() => {
    if (!CONFIG.quiet) {
      console.log('Test script finished');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
