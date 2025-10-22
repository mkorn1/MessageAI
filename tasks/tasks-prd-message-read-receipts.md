# Tasks: Message Read Receipts

## Relevant Files

- `src/services/messaging.ts` - Contains the existing `markMessagesAsRead` function that needs enhancement for automatic read marking
- `src/screens/ChatScreen.tsx` - Main chat interface where automatic read marking will be triggered
- `src/components/MessageBubble.tsx` - Message display component that shows read receipt status indicators
- `src/hooks/useMessages.ts` - Message management hook that needs integration with read marking
- `src/components/MessageList.tsx` - Message list component that handles scrolling and read marking
- `src/types/message.ts` - Message type definitions (already has MessageStatus enum)
- `src/services/messaging.test.ts` - Unit tests for messaging service enhancements
- `src/screens/ChatScreen.test.tsx` - Unit tests for chat screen read marking functionality
- `src/components/MessageBubble.test.tsx` - Unit tests for read receipt visual indicators
- `src/hooks/useMessages.test.ts` - Unit tests for message hook read marking integration

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests
- Focus on testing read marking logic, visual status updates, and real-time synchronization

## Tasks

- [ ] 1. Enhance Messaging Service for Automatic Read Marking
  - [ ] 1.1 Enhance `markMessagesAsRead` function to handle batch operations for multiple messages
  - [ ] 1.2 Add `markAllMessagesAsRead` function for marking all unread messages in a chat
  - [ ] 1.3 Implement read status tracking in Firestore with `readBy` field structure
  - [ ] 1.4 Add error handling and retry logic for read marking operations
  - [ ] 1.5 Add batch write operations to prevent individual message updates
  - [ ] 1.6 Implement read status validation to prevent duplicate marking
  - [ ] 1.7 Add unit tests for enhanced messaging service functions

- [ ] 2. Implement Chat Screen Read Marking Integration
  - [ ] 2.1 Add automatic read marking when ChatScreen component mounts
  - [ ] 2.2 Implement read marking when user scrolls through message history
  - [ ] 2.3 Add read marking integration to useMessages hook
  - [ ] 2.4 Handle rapid chat switching without duplicate read marking
  - [ ] 2.5 Add debouncing to prevent excessive read marking during scrolling
  - [ ] 2.6 Implement read marking for messages viewed while offline
  - [ ] 2.7 Add unit tests for ChatScreen read marking functionality

- [ ] 3. Update Message Visual Status Indicators
  - [ ] 3.1 Update `getStatusColor` function in MessageBubble to return blue (#007AFF) for READ status
  - [ ] 3.2 Ensure double blue checkmarks (✓✓) display correctly for read messages
  - [ ] 3.3 Update status icon display logic to show proper checkmark progression
  - [ ] 3.4 Add accessibility labels for read receipt status indicators
  - [ ] 3.5 Ensure status indicators only show on sender's own messages
  - [ ] 3.6 Test visual status updates across different message types
  - [ ] 3.7 Add unit tests for MessageBubble status indicator updates

- [ ] 4. Add Group Chat Read Count Display
  - [ ] 4.1 Implement read count calculation logic ("Read by X of Y" format)
  - [ ] 4.2 Add read count display below message timestamp for sender's messages
  - [ ] 4.3 Exclude sender from read count calculation
  - [ ] 4.4 Handle participant changes (add/remove) in read count updates
  - [ ] 4.5 Implement real-time read count updates as participants read messages
  - [ ] 4.6 Add proper styling for read count text (smaller, muted)
  - [ ] 4.7 Add unit tests for group chat read count functionality

- [ ] 5. Implement Offline Read Marking and Sync
  - [ ] 5.1 Track which messages were viewed while offline in local SQLite
  - [ ] 5.2 Implement offline read status sync when user returns online
  - [ ] 5.3 Add offline read status to local message cache
  - [ ] 5.4 Handle multiple offline sessions without losing read status
  - [ ] 5.5 Implement conflict resolution for offline vs online read status
  - [ ] 5.6 Add error handling for offline sync failures
  - [ ] 5.7 Add unit tests for offline read marking and sync functionality
