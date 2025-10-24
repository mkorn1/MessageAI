#!/usr/bin/env node

/**
 * AI Agent Webhook Test Script
 * 
 * This script tests the n8n webhook integration by sending test messages
 * and verifying the responses. Run this to test the AI agent functionality.
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  // Update these with your actual values
  n8nWebhookUrl: 'https://mkorn1.app.n8n.cloud/webhook/cfb3bef3-f299-4f85-8eb4-cb350dbbb810',
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  quiet: process.argv.includes('--quiet') || process.argv.includes('-q'),
};

// Test messages that should trigger different types of suggestions
const TEST_MESSAGES = [
  {
    name: 'Calendar Event',
    message: 'Let\'s meet tomorrow at 2pm in Conference Room A',
    expectedTypes: ['calendar_event'],
    description: 'Should detect meeting time, date, and location'
  },
  {
    name: 'Decision Summary',
    message: 'I think we should go with Option A. Sarah agrees, but Mike prefers Option B. What do you think?',
    expectedTypes: ['decision_summary'],
    description: 'Should detect decision topic and participants'
  },
  {
    name: 'Priority Flag',
    message: 'URGENT: Server is down and customers can\'t access the app!',
    expectedTypes: ['priority_flag'],
    description: 'Should detect urgency and priority level'
  },
  {
    name: 'RSVP Tracking',
    message: 'Please RSVP for the team dinner next Friday by Wednesday',
    expectedTypes: ['rsvp_tracking'],
    description: 'Should detect event and RSVP deadline'
  },
  {
    name: 'Deadline Reminder',
    message: 'Don\'t forget the project deadline is next Monday at 5pm',
    expectedTypes: ['deadline_reminder'],
    description: 'Should detect deadline date and urgency'
  },
  {
    name: 'Suggested Response',
    message: 'I\'m not sure how to respond to this difficult question',
    expectedTypes: ['suggested_response'],
    description: 'Should suggest helpful response options'
  }
];

// Test context messages
const TEST_CONTEXT = [
  {
    id: 'context-msg-1',
    text: 'How about we schedule a meeting?',
    senderId: 'user-2',
    chatId: 'test-chat-1',
    timestamp: new Date(Date.now() - 60000).toISOString()
  },
  {
    id: 'context-msg-2',
    text: 'That sounds good to me',
    senderId: 'user-1',
    chatId: 'test-chat-1',
    timestamp: new Date(Date.now() - 30000).toISOString()
  }
];

class WebhookTester {
  constructor() {
    this.results = [];
  }

  /**
   * Send HTTP request to webhook
   */
  async sendWebhookRequest(payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(CONFIG.n8nWebhookUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const postData = JSON.stringify(payload);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'MessageAI-Test/1.0'
        },
        timeout: CONFIG.timeout
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const responseData = data ? JSON.parse(data) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Test a single message
   */
  async testMessage(testCase) {
    const startTime = Date.now();
    
    if (!CONFIG.quiet) {
      console.log(`Testing: ${testCase.name}`);
    }
    
    const payload = {
      message: {
        id: `test-msg-${Date.now()}`,
        text: testCase.message,
        senderId: 'test-user-1',
        chatId: 'test-chat-1',
        timestamp: new Date().toISOString(),
        messageType: 'text'
      },
      chatContext: TEST_CONTEXT,
      userId: 'test-user-1'
    };

    try {
      const response = await this.sendWebhookRequest(payload);
      const duration = Date.now() - startTime;
      
      if (CONFIG.verbose) {
        console.log(`Response received (${duration}ms) - Status: ${response.statusCode}`);
      }
      
      if (response.statusCode === 200) {
        // Validate response format
        if (Array.isArray(response.data) && response.data.length > 0) {
          const suggestions = response.data;
          
          if (CONFIG.verbose) {
            console.log(`Generated ${suggestions.length} suggestions`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
          }
          
          this.results.push({
            testName: testCase.name,
            status: 'passed',
            duration,
            suggestionsCount: suggestions.length,
            response: response.data
          });
        } else {
          if (!CONFIG.quiet) {
            console.log(`Unexpected response format`);
          }
          this.results.push({
            testName: testCase.name,
            status: 'failed',
            duration,
            error: 'Invalid response format'
          });
        }
      } else {
        if (!CONFIG.quiet) {
          console.log(`HTTP Error: ${response.statusCode}`);
        }
        this.results.push({
          testName: testCase.name,
          status: 'failed',
          duration,
          error: `HTTP ${response.statusCode}`
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      if (!CONFIG.quiet) {
        console.log(`Error: ${error.message}`);
      }
      
      this.results.push({
        testName: testCase.name,
        status: 'failed',
        duration,
        error: error.message
      });
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    if (!CONFIG.quiet) {
      console.log('Starting AI Agent Webhook Tests');
      console.log('=' .repeat(50));
      console.log(`Webhook URL: ${CONFIG.n8nWebhookUrl}`);
      console.log(`Timeout: ${CONFIG.timeout}ms`);
      console.log(`Retry Attempts: ${CONFIG.retryAttempts}`);
    }
    
    for (const testCase of TEST_MESSAGES) {
      await this.testMessage(testCase);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.printResults();
  }

  /**
   * Print test results summary
   */
  printResults() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const total = this.results.length;
    
    if (CONFIG.quiet) {
      // Minimal output for quiet mode
      console.log(`${passed}/${total} tests passed`);
      if (failed > 0) {
        console.log('Failed:', this.results.filter(r => r.status === 'failed').map(r => r.testName).join(', '));
      }
      return;
    }
    
    console.log('\nTest Results Summary');
    console.log('=' .repeat(50));
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results.filter(r => r.status === 'failed').forEach(result => {
        console.log(`  - ${result.testName}: ${result.error}`);
      });
    }
    
    if (CONFIG.verbose) {
      console.log('\nDetailed Results:');
      this.results.forEach(result => {
        const status = result.status === 'passed' ? 'PASS' : 'FAIL';
        const duration = result.duration ? ` (${result.duration}ms)` : '';
        const suggestions = result.suggestionsCount ? ` - ${result.suggestionsCount} suggestions` : '';
        console.log(`  ${status} ${result.testName}${duration}${suggestions}`);
      });
    }
    
    console.log('\nWebhook testing completed!');
    
    if (passed === total) {
      console.log('All tests passed! The AI agent is working correctly.');
    } else {
      console.log('Some tests failed. Check the webhook configuration and n8n setup.');
    }
  }
}

// Test configuration validation
function validateConfig() {
  if (!CONFIG.n8nWebhookUrl) {
    console.error('Error: n8nWebhookUrl is not configured');
    console.log('Please update the CONFIG object with your webhook URL');
    process.exit(1);
  }
  
  try {
    new URL(CONFIG.n8nWebhookUrl);
  } catch (error) {
    console.error('Error: Invalid webhook URL format');
    console.log('Please check the n8nWebhookUrl in the CONFIG object');
    process.exit(1);
  }
}

// Main execution
async function main() {
  if (!CONFIG.quiet) {
    console.log('AI Agent Webhook Test Script');
    console.log('================================');
  }
  
  validateConfig();
  
  const tester = new WebhookTester();
  await tester.runAllTests();
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { WebhookTester, TEST_MESSAGES, CONFIG };
