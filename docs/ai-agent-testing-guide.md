# AI Agent Testing Guide

## Overview
This guide provides comprehensive testing strategies for the AI Agent feature, covering both manual testing and automated testing scenarios.

## Testing Strategy

### 1. **Unit Testing** - Individual Components
### 2. **Integration Testing** - Component Interactions  
### 3. **End-to-End Testing** - Complete User Flows
### 4. **Manual Testing** - Real User Scenarios

---

## 1. Unit Testing

### Test Individual Components

#### A. Test AI Suggestion Types
```bash
# Run type validation tests
npm test src/types/aiSuggestion.test.ts
```

#### B. Test Services
```bash
# Test webhook service
npm test src/services/n8nWebhookService.test.ts

# Test suggestion service  
npm test src/services/aiSuggestionService.test.ts

# Test action service
npm test src/services/aiSuggestionActionService.test.ts
```

#### C. Test Hooks
```bash
# Test message analysis hook
npm test src/hooks/useMessageAnalysis.test.ts

# Test suggestions hook
npm test src/hooks/useAISuggestions.test.ts
```

#### D. Test Components
```bash
# Test suggestion card
npm test src/components/AISuggestionCard.test.tsx

# Test suggestion list
npm test src/components/AISuggestionList.test.tsx
```

---

## 2. Integration Testing

### Test Component Interactions

#### A. Test Notifications Tab Integration
```bash
# Test the complete notifications tab flow
npm test app/\(tabs\)/notifications.test.tsx
```

#### B. Test Real-time Updates
- Verify suggestions appear in real-time when created
- Test badge count updates
- Test suggestion status changes

---

## 3. End-to-End Testing

### Complete User Flows

#### Flow 1: Message Analysis → Suggestion Creation → User Action
1. **Send a message** that should trigger AI analysis
2. **Verify webhook call** to n8n is made
3. **Check suggestion creation** in Firestore
4. **Verify suggestion appears** in UI
5. **Test user actions** (confirm/reject)
6. **Verify action execution** and status updates

#### Flow 2: Multiple Suggestions → Filtering → Navigation
1. **Create multiple suggestions** of different types
2. **Test filtering** by type and status
3. **Test sorting** options
4. **Test navigation** to source chat
5. **Test badge count** updates

---

## 4. Manual Testing Scenarios

### Scenario 1: Calendar Event Detection
**Test Message:** "Let's meet tomorrow at 2pm in Conference Room A"

**Expected Results:**
- ✅ Webhook call to n8n
- ✅ Calendar event suggestion created
- ✅ Suggestion appears in To-do's tab
- ✅ User can confirm → Calendar event created
- ✅ User can reject → Suggestion marked as rejected

### Scenario 2: Decision Summary
**Test Message:** "I think we should go with Option A. Sarah agrees, but Mike prefers Option B. What do you think?"

**Expected Results:**
- ✅ Decision summary suggestion created
- ✅ Shows participants (Sarah, Mike)
- ✅ User can confirm → Decision saved
- ✅ User can reject → Suggestion dismissed

### Scenario 3: Priority Flag
**Test Message:** "URGENT: Server is down and customers can't access the app!"

**Expected Results:**
- ✅ Priority flag suggestion created
- ✅ High priority level detected
- ✅ Urgency reason extracted
- ✅ User can confirm → Priority flag set

### Scenario 4: RSVP Tracking
**Test Message:** "Please RSVP for the team dinner next Friday by Wednesday"

**Expected Results:**
- ✅ RSVP tracking suggestion created
- ✅ Deadline detected (Wednesday)
- ✅ Event details extracted
- ✅ User can confirm → RSVP tracking set up

### Scenario 5: Deadline Reminder
**Test Message:** "Don't forget the project deadline is next Monday at 5pm"

**Expected Results:**
- ✅ Deadline reminder suggestion created
- ✅ Deadline date detected
- ✅ Reminder date calculated
- ✅ User can confirm → Reminder set

---

## 5. Testing Tools & Utilities

### A. Test Data Generator
```javascript
// scripts/generateTestSuggestions.js
const generateTestSuggestions = () => {
  const suggestions = [
    {
      type: 'calendar_event',
      title: 'Team Meeting Tomorrow',
      description: 'Meeting scheduled for tomorrow at 2pm',
      metadata: {
        eventDate: new Date('2024-01-15T14:00:00Z'),
        eventLocation: 'Conference Room A',
        eventDuration: 60,
        confidence: 0.95
      }
    },
    {
      type: 'decision_summary', 
      title: 'Project Direction Decision',
      description: 'Team decided to use React Native for mobile app',
      metadata: {
        decisionSummary: 'Use React Native for mobile development',
        participants: ['user1', 'user2', 'user3'],
        confidence: 0.88
      }
    },
    {
      type: 'priority_flag',
      title: 'Urgent Server Issue',
      description: 'Server is down and needs immediate attention',
      metadata: {
        priorityLevel: 5,
        urgencyReason: 'Server down affecting customers',
        confidence: 0.92
      }
    }
  ];
  
  return suggestions;
};
```

### B. Webhook Testing Tool
```javascript
// scripts/testN8nWebhook.js
const testN8nWebhook = async () => {
  const testMessage = {
    message: {
      id: 'test-msg-1',
      text: 'Let\'s meet tomorrow at 2pm in Conference Room A',
      senderId: 'test-user-1',
      chatId: 'test-chat-1',
      timestamp: new Date().toISOString(),
      messageType: 'text'
    },
    chatContext: [
      {
        id: 'context-msg-1',
        text: 'How about we schedule a meeting?',
        senderId: 'test-user-2',
        chatId: 'test-chat-1',
        timestamp: new Date(Date.now() - 60000).toISOString()
      }
    ],
    userId: 'test-user-1'
  };

  try {
    const response = await fetch('YOUR_N8N_WEBHOOK_URL', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });

    const result = await response.json();
    console.log('Webhook Response:', result);
    return result;
  } catch (error) {
    console.error('Webhook Error:', error);
    throw error;
  }
};
```

### C. Firestore Testing Helper
```javascript
// scripts/testFirestoreOperations.js
const testFirestoreOperations = async () => {
  const { db } = require('./firebase');
  const { collection, addDoc, getDocs, query, where } = require('firebase/firestore');

  // Test creating suggestions
  const suggestionsRef = collection(db, 'aiSuggestions');
  const testSuggestion = {
    userId: 'test-user-1',
    chatId: 'test-chat-1',
    messageId: 'test-msg-1',
    type: 'calendar_event',
    status: 'pending',
    title: 'Test Calendar Event',
    description: 'Test description',
    metadata: { confidence: 0.8 },
    createdAt: new Date()
  };

  try {
    // Create suggestion
    const docRef = await addDoc(suggestionsRef, testSuggestion);
    console.log('✅ Suggestion created:', docRef.id);

    // Query suggestions
    const q = query(suggestionsRef, where('userId', '==', 'test-user-1'));
    const querySnapshot = await getDocs(q);
    console.log('✅ Suggestions found:', querySnapshot.size);

    return { success: true, docId: docRef.id };
  } catch (error) {
    console.error('❌ Firestore operation failed:', error);
    return { success: false, error: error.message };
  }
};
```

---

## 6. Testing Checklist

### Pre-Testing Setup
- [ ] Firebase project configured
- [ ] n8n webhook URL configured
- [ ] Test users created
- [ ] Security rules deployed
- [ ] App built and running

### Component Testing
- [ ] AI Suggestion types validate correctly
- [ ] Webhook service handles errors gracefully
- [ ] Suggestion service CRUD operations work
- [ ] Action service executes suggestions properly
- [ ] Hooks manage state correctly
- [ ] Components render and interact properly

### Integration Testing
- [ ] Message analysis triggers webhook calls
- [ ] Webhook responses create suggestions
- [ ] Suggestions appear in UI in real-time
- [ ] User actions update suggestion status
- [ ] Action execution works for all types
- [ ] Navigation to source chat works
- [ ] Badge count updates correctly

### End-to-End Testing
- [ ] Complete message → suggestion → action flow
- [ ] Multiple suggestion types work
- [ ] Filtering and sorting work
- [ ] Real-time updates work
- [ ] Error handling works
- [ ] Security rules prevent unauthorized access

### Performance Testing
- [ ] Webhook calls complete within timeout
- [ ] UI remains responsive during operations
- [ ] Real-time updates don't cause lag
- [ ] Large numbers of suggestions handled well

### Security Testing
- [ ] Users can only access their own suggestions
- [ ] Unauthenticated access is blocked
- [ ] Field validation prevents invalid data
- [ ] Status transitions are controlled
- [ ] Immutable fields cannot be changed

---

## 7. Debugging Tips

### Common Issues & Solutions

#### Issue: Suggestions not appearing
**Debug Steps:**
1. Check webhook calls in network tab
2. Verify n8n response format
3. Check Firestore for created suggestions
4. Verify real-time listeners are active
5. Check console for errors

#### Issue: Webhook calls failing
**Debug Steps:**
1. Verify n8n webhook URL is correct
2. Check network connectivity
3. Verify request payload format
4. Check n8n webhook configuration
5. Test webhook manually with Postman

#### Issue: Actions not executing
**Debug Steps:**
1. Check suggestion status updates
2. Verify action service is called
3. Check execution result in Firestore
4. Verify user feedback (alerts)
5. Check console for errors

#### Issue: Real-time updates not working
**Debug Steps:**
1. Verify Firestore security rules
2. Check real-time listener setup
3. Verify user authentication
4. Check Firestore indexes
5. Test with Firestore emulator

---

## 8. Test Automation

### Automated Test Suite
```bash
# Run all AI agent tests
npm run test:ai-agent

# Run specific test categories
npm run test:ai-agent:unit
npm run test:ai-agent:integration
npm run test:ai-agent:e2e

# Run tests with coverage
npm run test:ai-agent:coverage
```

### CI/CD Integration
```yaml
# .github/workflows/ai-agent-tests.yml
name: AI Agent Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ai-agent
      - run: npm run test:ai-agent:coverage
```

---

## 9. Production Testing

### Staging Environment
1. Deploy to staging environment
2. Test with real n8n webhook
3. Test with production-like data
4. Performance testing
5. Security testing

### Production Monitoring
1. Set up error tracking
2. Monitor webhook success rates
3. Track suggestion creation rates
4. Monitor user engagement
5. Set up alerts for failures

---

## 10. Success Metrics

### Technical Metrics
- Webhook success rate > 95%
- Suggestion creation time < 2 seconds
- UI response time < 500ms
- Error rate < 1%

### User Experience Metrics
- Suggestion accuracy > 80%
- User confirmation rate > 60%
- Feature adoption rate > 40%
- User satisfaction score > 4.0/5.0

---

## Quick Start Testing

### 1. Manual Test (5 minutes)
1. Open the app
2. Go to notifications → To-do's tab
3. Send a test message: "Let's meet tomorrow at 2pm"
4. Wait for suggestion to appear
5. Confirm the suggestion
6. Verify action execution

### 2. Automated Test (2 minutes)
```bash
npm run test:ai-agent:quick
```

### 3. Full Test Suite (15 minutes)
```bash
npm run test:ai-agent:full
```

This comprehensive testing strategy ensures the AI agent feature works reliably and provides a great user experience! 🚀
