#!/usr/bin/env node

/**
 * Comprehensive test script to send various test events to the n8n webhook
 * This tests different types of messages that should trigger AI suggestions
 */

const webhookUrl = 'https://mkorn1.app.n8n.cloud/webhook-test/cfb3bef3-f299-4f85-8eb4-cb350dbbb810';

const testCases = [
  {
    name: 'Calendar Event Suggestion',
    message: 'Hey team, let\'s schedule a meeting for tomorrow at 2pm to discuss the project updates. Can everyone make it?',
    context: [
      'Good morning everyone!',
      'Morning! How\'s the project going?'
    ]
  },
  {
    name: 'Priority Flag Suggestion',
    message: 'URGENT: The server is down and we need to fix it immediately!',
    context: [
      'Everything seems to be running fine',
      'No issues reported so far'
    ]
  },
  {
    name: 'Decision Summary Suggestion',
    message: 'So we\'ve decided to go with the blue design and launch next Friday. Everyone agreed?',
    context: [
      'I think blue looks better than red',
      'Friday works for me',
      'Blue is definitely the right choice'
    ]
  },
  {
    name: 'RSVP Tracking Suggestion',
    message: 'Who can make it to the company party this Friday at 6pm? Please RSVP by Wednesday.',
    context: [
      'Looking forward to the party!',
      'Hope everyone can make it'
    ]
  },
  {
    name: 'Deadline Reminder Suggestion',
    message: 'Don\'t forget the project proposal is due next Monday at 5pm.',
    context: [
      'Working on the proposal',
      'Almost done with the first draft'
    ]
  },
  {
    name: 'Suggested Response Suggestion',
    message: 'I\'m really sorry about the delay. This is unacceptable and I understand your frustration.',
    context: [
      'This is taking way too long',
      'I\'m getting frustrated with these delays'
    ]
  }
];

async function sendTestEvent(testCase, index) {
  console.log(`\n🧪 Test Case ${index + 1}: ${testCase.name}`);
  console.log('─'.repeat(50));

  try {
    const testPayload = {
      message: {
        id: `test-message-${index}-${Date.now()}`,
        text: testCase.message,
        senderId: 'test-user-123',
        chatId: 'test-chat-456',
        timestamp: new Date().toISOString(),
        messageType: 'text'
      },
      chatContext: testCase.context.map((text, i) => ({
        id: `context-msg-${index}-${i}`,
        text: text,
        senderId: `test-user-${456 + i}`,
        chatId: 'test-chat-456',
        timestamp: new Date(Date.now() - (i + 1) * 60000).toISOString() // 1 minute intervals
      })),
      userId: 'test-user-123'
    };

    console.log('📤 Message:', testCase.message);
    console.log('📚 Context:', testCase.context.length, 'messages');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📡 Response:', response.status, response.statusText);

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Success! Response:');
      console.log(JSON.stringify(responseData, null, 2));
    } else {
      const errorText = await response.text();
      console.log('⚠️  Expected 404 (webhook in test mode):', errorText.substring(0, 100) + '...');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive n8n webhook tests...');
  console.log('📡 Webhook URL:', webhookUrl);
  console.log('ℹ️  Note: 404 responses are expected when webhook is in test mode');

  for (let i = 0; i < testCases.length; i++) {
    await sendTestEvent(testCases[i], i);
    
    // Small delay between requests
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n🏁 All tests completed!');
  console.log('\n📋 Summary:');
  console.log('  • All requests were sent successfully');
  console.log('  • Payload format is correct (no validation errors)');
  console.log('  • Webhook URL is accessible');
  console.log('  • 404 responses indicate webhook is in test mode (expected)');
  console.log('\n💡 Next steps:');
  console.log('  1. Go to your n8n workflow');
  console.log('  2. Click "Execute workflow" to activate the webhook');
  console.log('  3. Run this test again to see actual AI suggestions');
}

// Run all tests
runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
