# AI Agent Integration - Task List

## Relevant Files

- `src/types/aiSuggestion.ts` - TypeScript interfaces and enums for AI suggestions
- `src/services/n8nWebhookService.ts` - Service to send messages to n8n analysis webhook
- `src/services/aiSuggestionService.ts` - Firestore CRUD operations for aiSuggestions collection
- `src/hooks/useMessageAnalysis.ts` - Hook to trigger webhook calls when messages are sent
- `src/hooks/useAISuggestions.ts` - Hook to fetch and manage user's AI suggestions
- `src/components/AISuggestionCard.tsx` - Individual suggestion card component with confirm/reject actions
- `src/components/AISuggestionList.tsx` - List component to display all pending suggestions
- `app/(tabs)/notifications.tsx` - Modified to integrate suggestions panel into To-do's tab
- `firestore.rules` - Updated with security rules for aiSuggestions collection
- `src/config/n8nConfig.ts` - Configuration for n8n webhook URLs and authentication

### Notes

- Unit tests should be placed alongside the code files they are testing (e.g., `AISuggestionCard.tsx` and `AISuggestionCard.test.tsx` in the same directory)
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration

## Tasks

- [x] 1. Create AI Suggestion Types and Firestore Schema
  - [x] 1.1 Create TypeScript interfaces for AISuggestion, AISuggestionType, and AISuggestionStatus
  - [x] 1.2 Define metadata structures for each suggestion type (calendar events, decisions, etc.)
  - [x] 1.3 Create helper types for creating and updating suggestions
  - [x] 1.4 Document the Firestore schema structure for aiSuggestions collection

- [ ] 2. Build Webhook Service to Send Messages to n8n
  - [x] 2.1 Create n8nWebhookService with method to send message analysis requests
  - [x] 2.2 Implement function to fetch last 10 messages from all chats for context
  - [x] 2.3 Add webhook payload formatting according to n8n expected format
  - [x] 2.4 Implement retry logic with exponential backoff for failed webhook calls
  - [x] 2.5 Add error handling for network failures and timeout scenarios
  - [x] 2.6 Create configuration file for n8n webhook URLs and authentication

- [x] 2. Build Webhook Service to Send Messages to n8n

- [x] 3. Build Webhook Response Handler to Receive Suggestions from n8n
  - [x] 3.1 Create aiSuggestionService for Firestore CRUD operations
  - [x] 3.2 Implement function to parse n8n webhook response and create suggestions
  - [x] 3.3 Add validation for incoming suggestion data from n8n
  - [x] 3.4 Implement batch creation of multiple suggestions from single webhook response
  - [x] 3.5 Add logging and error handling for malformed n8n responses

- [x] 4. Create UI Components for Suggestions Panel
  - [x] 4.1 Build AISuggestionCard component with type-specific icons and styling
  - [x] 4.2 Add confirm/reject buttons with loading states and success feedback
  - [x] 4.3 Implement expand/collapse functionality for suggestion details
  - [x] 4.4 Add source context display (chat name, message preview)
  - [x] 4.5 Build AISuggestionList component with pull-to-refresh and empty states
  - [ ] 4.6 Add filtering by suggestion status (pending, confirmed, rejected)

- [x] 5. Integrate Suggestions Panel into To-do's Tab
  - [x] 5.1 Create useMessageAnalysis hook to trigger webhook calls on new messages
  - [x] 5.2 Create useAISuggestions hook to manage suggestion state and real-time updates
  - [x] 5.3 Replace empty state in notifications.tsx To-do's tab with AISuggestionList
  - [x] 5.4 Add navigation to source chat when tapping on suggestion context
  - [x] 5.5 Implement suggestion confirmation flow with action execution
  - [x] 5.6 Add badge count for pending suggestions in tab bar

- [x] 6. Add Firestore Security Rules for aiSuggestions Collection
  - [x] 6.1 Create security rules allowing users to read/write only their own suggestions
  - [x] 6.2 Add validation rules for required fields in suggestion documents
  - [x] 6.3 Implement rules to prevent unauthorized access to suggestion metadata
  - [x] 6.4 Test security rules with different user scenarios and edge cases
