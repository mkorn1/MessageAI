# AI Agent Integration Feature PRD - MessageAI

## Feature Overview
**Feature Name:** AI Agent Integration  
**Priority:** High (Post-MVP Enhancement)  
**Timeline:** 3-Phase Implementation  
**Scope:** Autonomous AI agent that analyzes messages and generates actionable suggestions  
**Implementation:** n8n webhook integration with React Native frontend

---

## User Stories

### Primary User: Busy Parent/Caregiver (Sarah, 35)
Sarah juggles two kids' schedules, coordinates with her partner, manages school communications, and organizes playdates. She struggles with schedule juggling, missing dates/appointments, decision fatigue, and information overload.

**As Sarah, I want to:**
1. Have my messages automatically analyzed for action items so I don't miss important commitments buried in conversations
2. See AI-generated calendar event suggestions when someone mentions "meeting tomorrow at 3pm" so I can add it to my calendar with one tap
3. Get decision summaries when group chats have long discussions so I can quickly understand what was decided
4. Have priority messages flagged automatically when someone says "urgent" or "ASAP" so I don't miss critical information
5. Track RSVP responses when I ask "who can make it to the birthday party?" so I know who still needs to respond
6. Get deadline reminders extracted from messages like "project due next Friday" so I don't forget important dates
7. See suggested responses when appropriate so I can quickly reply without typing everything out
8. Have all suggestions appear in one organized place (To-do's panel) so I can review and confirm actions efficiently

### Secondary User: Partner/Family Member (Mike, 37)
**As Mike, I want to:**
1. Know that Sarah will see important action items from our conversations even if she's busy
2. Have confidence that calendar events we discuss will be automatically suggested to Sarah
3. See when Sarah has confirmed or rejected AI suggestions so I know if she's handling the action items

---

## Feature Requirements

### Core Functionality

#### AI Message Analysis
- **Trigger:** Every message sent across all chats triggers AI analysis
- **Context:** Analysis uses the last 10 messages from all chats combined
- **Message Types:** Analyzes all message types (text, images, system messages)
- **Processing:** Real-time analysis via n8n webhook integration
- **Response Time:** Analysis completes within 5 seconds of message send

#### Suggestion Generation
The AI generates suggestions for these categories:

1. **Calendar Events**
   - Detects mentions of dates, times, meetings, appointments
   - Creates calendar event suggestions with extracted details
   - Example: "Add 'Soccer practice pickup - Saturday 3pm' to your calendar"

2. **Decision Summaries**
   - Identifies when group discussions reach conclusions
   - Summarizes key decisions made in conversations
   - Example: "Decision: Sarah will handle pickup, Mike will handle drop-off"

3. **Priority Message Flags**
   - Flags messages containing urgent keywords ("urgent", "ASAP", "important")
   - Marks messages as high priority for attention
   - Example: "Priority: Urgent message about school closure"

4. **RSVP Tracking**
   - Tracks when user asks questions requiring responses
   - Monitors who has/hasn't responded to user's questions
   - Example: "RSVP Tracking: 3 people haven't responded to birthday party invite"

5. **Deadline/Reminder Extraction**
   - Extracts deadlines, due dates, and time-sensitive commitments
   - Creates reminder suggestions with extracted dates
   - Example: "Reminder: School project due Friday, March 15th"

#### Suggestion Management
- **Storage:** All suggestions stored in Firestore `aiSuggestions` collection
- **Status Tracking:** PENDING → CONFIRMED/REJECTED → EXECUTED
- **Persistence:** Suggestions remain pending indefinitely (no expiration)
- **Rejection:** Rejected suggestions are permanently hidden
- **User Control:** Users can confirm or reject each suggestion individually

#### Action Execution
When users confirm suggestions, the system:

1. **Calendar Events:** Sends webhook to n8n with event details for calendar creation
2. **Decision Summaries:** Stores summary in chat metadata for reference
3. **Priority Flags:** Updates message metadata to mark as priority
4. **RSVP Tracking:** Sends webhook to n8n for response tracking setup
5. **Deadline Reminders:** Sends webhook to n8n for reminder creation
6. **Suggested Responses:** Populates response directly in relevant chat input field

---

## Technical Architecture

### Data Flow
```
Message Sent → Firestore Listener → n8n Analysis Webhook 
→ AI Processing → Suggestion Generated → aiSuggestions Collection 
→ To-do's UI → User Confirms → n8n Action Webhook → Action Executed
```

### Firestore Schema: `aiSuggestions`
```typescript
interface AISuggestion {
  id: string;
  userId: string; // User who will see the suggestion
  chatId: string;
  messageId: string; // Triggering message
  type: AISuggestionType;
  status: AISuggestionStatus;
  title: string;
  description: string;
  metadata: {
    // Type-specific data
    eventDate?: Date;
    eventLocation?: string;
    decisionSummary?: string;
    priorityLevel?: number;
    rsvpDeadline?: Date;
    reminderDate?: Date;
    sourceMessages?: string[]; // IDs of analyzed messages
    suggestedResponse?: string;
  };
  createdAt: Date;
  confirmedAt?: Date;
  rejectedAt?: Date;
  executedAt?: Date;
  executionResult?: {
    success: boolean;
    message?: string;
    data?: any;
  };
}

enum AISuggestionType {
  CALENDAR_EVENT = 'calendar_event',
  DECISION_SUMMARY = 'decision_summary', 
  PRIORITY_FLAG = 'priority_flag',
  RSVP_TRACKING = 'rsvp_tracking',
  DEADLINE_REMINDER = 'deadline_reminder',
  SUGGESTED_RESPONSE = 'suggested_response'
}

enum AISuggestionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  EXECUTED = 'executed'
}
```

### n8n Webhook Integration

#### Analysis Webhook (MessageAI → n8n)
**Endpoint:** `POST /webhook/message-analysis`
**Payload:**
```json
{
  "message": {
    "id": "string",
    "text": "string", 
    "senderId": "string",
    "chatId": "string",
    "timestamp": "ISO string",
    "messageType": "text|image|file|system"
  },
  "chatContext": [
    {
      "id": "string",
      "text": "string",
      "senderId": "string", 
      "chatId": "string",
      "timestamp": "ISO string"
    }
  ],
  "userId": "string"
}
```

#### Analysis Response (n8n → MessageAI)
**Response Format:**
```json
{
  "suggestions": [
    {
      "type": "calendar_event",
      "title": "Add team meeting to calendar",
      "description": "Meeting scheduled for tomorrow at 2pm",
      "metadata": {
        "eventDate": "2024-03-15T14:00:00Z",
        "eventLocation": "Conference Room A"
      }
    }
  ]
}
```

#### Action Webhook (MessageAI → n8n)
**Endpoint:** `POST /webhook/execute-action`
**Payload:**
```json
{
  "suggestionId": "string",
  "type": "calendar_event",
  "userId": "string",
  "metadata": {
    "eventDate": "2024-03-15T14:00:00Z",
    "eventLocation": "Conference Room A"
  }
}
```

### UI Components

#### To-do's Panel Integration
- **Location:** Existing "To do's" tab in notifications screen
- **Display:** List of pending AI suggestions grouped by chat
- **Actions:** Confirm/Reject buttons for each suggestion
- **Navigation:** Tap suggestion to view source chat context
- **Empty State:** "No AI suggestions yet" when no pending items

#### Suggestion Card Design
- **Icon:** Type-specific icon (calendar, flag, summary, etc.)
- **Title:** Clear action description
- **Description:** Detailed explanation of suggestion
- **Context:** Source chat name and message preview
- **Actions:** Confirm (green) and Reject (red) buttons
- **Status:** Visual indicators for pending/confirming/confirmed states

---

## Implementation Phases

### Phase 1: Frontend UI (Week 1)
- Create AI suggestion types and interfaces
- Build suggestion list and card components
- Integrate with existing To-do's panel
- Add badge count for pending suggestions
- Implement confirm/reject interactions

### Phase 2: Mock Infrastructure (Week 2)
- Create AI suggestion service for Firestore operations
- Build mock AI analysis service with keyword detection
- Implement message analysis hook with real-time listeners
- Add Firestore security rules for aiSuggestions collection
- Test end-to-end flow with mock suggestions

### Phase 3: n8n Integration (Week 3)
- Create n8n webhook service for real API calls
- Replace mock service with actual n8n integration
- Implement action execution service
- Add environment configuration for webhook URLs
- End-to-end testing with real n8n workflows

---

## Non-Goals (Out of Scope)

### Privacy Controls
- No user settings to disable AI analysis per chat
- No granular privacy controls for suggestion types
- No opt-out mechanisms for specific users

### Advanced Features
- No machine learning model training
- No suggestion learning from user behavior
- No multi-language support for analysis
- No voice message analysis
- No suggestion sharing between users

### Success Metrics
- No formal success measurement implementation
- No analytics tracking for suggestion acceptance rates
- No performance monitoring for webhook response times

---

## Technical Considerations

### Performance
- **Webhook Timeout:** 10-second timeout for n8n analysis calls
- **Retry Logic:** Exponential backoff for failed webhook calls
- **Rate Limiting:** Prevent excessive webhook calls during high message volume
- **Caching:** Cache recent analysis results to avoid duplicate processing

### Error Handling
- **Webhook Failures:** Graceful degradation when n8n is unavailable
- **Malformed Responses:** Handle invalid n8n response formats
- **Network Issues:** Retry mechanisms for connectivity problems
- **User Feedback:** Clear error messages for failed actions

### Security
- **Webhook Authentication:** API key authentication for n8n endpoints
- **Data Privacy:** No sensitive message content stored in suggestion metadata
- **User Isolation:** Users can only see their own suggestions
- **Input Validation:** Sanitize all webhook payloads and responses

---

## Open Questions

1. **n8n Workflow Design:** What specific n8n workflows need to be created for each suggestion type?
2. **Webhook Authentication:** What authentication method should be used for n8n webhooks (API key, OAuth, etc.)?
3. **Error Recovery:** How should the system handle partial failures (e.g., analysis succeeds but suggestion creation fails)?
4. **Suggestion Limits:** Should there be a maximum number of pending suggestions per user?
5. **Cross-Platform:** How will calendar integration work across iOS and Android platforms?
6. **Testing Strategy:** What testing approach should be used for n8n webhook integration?
