# PRD: Message Read Receipts

## Introduction/Overview

This feature implements comprehensive read receipt functionality for both individual and group chats, providing senders with clear visual feedback about message delivery and read status. The feature builds upon the existing message status system (SENDING → SENT → DELIVERED → READ) and integrates with the current `markMessagesAsRead` function in the messaging service.

**Problem Solved**: Users currently experience anxiety about message delivery and frequently send follow-up messages asking "Did you see my message?" This creates communication friction and reduces confidence in the messaging system.

**Goal**: Provide automatic, reliable read receipt tracking that reduces follow-up messages and communication anxiety by giving senders clear visual confirmation of message status.

## Goals

1. **Reduce Communication Anxiety**: Eliminate "Did you see my message?" follow-ups through clear read status
2. **Automatic Read Tracking**: Mark messages as read automatically when users view chats
3. **Visual Clarity**: Use intuitive checkmark system (single → double gray → double blue)
4. **Group Chat Support**: Show read count for group messages ("Read by 2 of 5")
5. **Offline Resilience**: Handle offline read marking when users return online
6. **Real-Time Updates**: Provide immediate read status updates to senders

## User Stories

### Primary User Stories
- **As a message sender**, I want to see blue checkmarks when my messages are read so that I know the recipient has seen them
- **As a busy parent**, I want to know when my partner has read my pickup time message so that I don't need to follow up
- **As a group chat participant**, I want to see "Read by 3 of 5" so that I know how many people have seen my message
- **As a user**, I want messages automatically marked as read when I open a chat so that I don't need to manually mark them

### Secondary User Stories
- **As a sender**, I want read receipts to update in real-time so that I see status changes immediately
- **As an offline user**, I want messages marked as read when I return online so that read status is accurate
- **As a mobile user**, I want clear visual indicators that don't clutter the interface

## Functional Requirements

### 1. Automatic Read Marking
1.1. Mark messages as read automatically when user opens a chat screen
1.2. Mark messages as read when user scrolls through message history
1.3. Mark messages as read when user returns online after viewing messages offline
1.4. Only mark messages as read for messages sent by other users (not own messages)
1.5. Mark all unread messages in a chat as read when chat is opened
1.6. Handle rapid chat switching without duplicate read marking

### 2. Visual Status Indicators
2.1. Use single checkmark (✓) for SENT status (server received)
2.2. Use double gray checkmarks (✓✓) for DELIVERED status (recipient device received)
2.3. Use double blue checkmarks (✓✓) for READ status (recipient viewed message)
2.4. Use clock icon (⏳) for SENDING status (optimistic UI)
2.5. Use warning icon (⚠️) for FAILED status
2.6. Apply blue color (#007AFF) to read checkmarks for visual distinction
2.7. Show status indicators only on sender's own messages

### 3. Individual Chat Read Receipts
3.1. Display read status with double blue checkmarks
3.2. Update read status in real-time when recipient opens chat
3.3. Show delivered status (double gray) until marked as read
3.4. Handle offline scenarios: mark as read when user returns online
3.5. Maintain read status across app restarts and device switches

### 4. Group Chat Read Receipts
4.1. Display read count format: "Read by X of Y" where X = read count, Y = total participants
4.2. Show read count below message timestamp for sender's messages
4.3. Update read count in real-time as participants read messages
4.4. Exclude sender from read count calculation
4.5. Handle participant changes (add/remove) in read count calculation
4.6. Show "Read by 0 of Y" for newly sent messages

### 5. Real-Time Updates
5.1. Update read status immediately when recipient opens chat
5.2. Sync read status across all sender's devices in real-time
5.3. Update group read counts as participants read messages
5.4. Handle network interruptions gracefully with eventual consistency
5.5. Provide optimistic UI updates for read status changes

### 6. Offline Handling
6.1. Track which messages were viewed while offline
6.2. Mark messages as read when user returns online
6.3. Sync offline read status with server when connection restored
6.4. Handle multiple offline sessions without losing read status
6.5. Maintain read status in local SQLite cache

### 7. Integration with Existing System
7.1. Use existing `markMessagesAsRead` function in MessagingService
7.2. Integrate with current MessageStatus enum (SENDING, SENT, DELIVERED, READ, FAILED)
7.3. Work with existing MessageBubble component status display
7.4. Maintain compatibility with current message state machine
7.5. Use existing Firestore real-time listeners for status updates

## Non-Goals (Out of Scope)

- **Manual Read Marking**: Users cannot manually mark messages as read/unread
- **Read Timestamps**: No display of when messages were read
- **Individual Read Lists**: No "Read by Sarah, Mike" in group chats
- **Privacy Controls**: No ability to disable read receipts
- **Read Receipt Delays**: No minimum viewing time before marking as read
- **System Message Receipts**: System messages don't have read receipts
- **Message Editing/Deletion Impact**: Edited/deleted messages don't affect read receipts
- **Advanced Status Types**: No "typing" or "seen" status beyond current system
- **Read Receipt History**: No tracking of read receipt changes over time
- **Cross-Platform Sync**: Focus on mobile app only for MVP

## Design Considerations

### Visual Design
- **Checkmark Progression**: Single → Double Gray → Double Blue (following iOS/WhatsApp pattern)
- **Color Consistency**: Use #007AFF blue for read status (matches iOS system blue)
- **Size and Spacing**: Maintain current checkmark sizing (11px font) for consistency
- **Positioning**: Keep status indicators in message footer, aligned to the right
- **Group Read Count**: Display below timestamp in smaller, muted text

### User Experience
- **Immediate Feedback**: Read status updates within 1 second of recipient viewing
- **Non-Intrusive**: Status indicators don't interfere with message content
- **Consistent Behavior**: Same read marking behavior across individual and group chats
- **Offline Transparency**: Users don't need to know about offline read tracking

### Accessibility
- **Screen Reader Support**: Add accessibility labels for read status
- **Color Contrast**: Ensure blue checkmarks meet accessibility standards
- **Touch Targets**: Status indicators don't interfere with message interaction

## Technical Considerations

### Integration Points
- **MessagingService**: Extend `markMessagesAsRead` function for automatic marking
- **ChatScreen**: Add read marking on component mount and message viewing
- **MessageBubble**: Update status display logic for blue read checkmarks
- **useMessages Hook**: Integrate read marking with message loading and real-time updates

### Data Flow
```
User Opens Chat → ChatScreen Mount → Mark All Unread Messages as Read → 
Update Firestore → Real-Time Listener → Update Sender's UI → Blue Checkmarks
```

### Performance Optimizations
- **Batch Read Updates**: Mark multiple messages as read in single Firestore batch
- **Debounced Updates**: Prevent rapid read marking during scrolling
- **Efficient Listeners**: Use single listener per chat for read status updates
- **Local Caching**: Cache read status in SQLite for offline scenarios

### Error Handling
- **Network Failures**: Retry read marking with exponential backoff
- **Firestore Errors**: Handle permission and quota errors gracefully
- **Offline Sync**: Queue read marking for when connection returns
- **Duplicate Prevention**: Prevent multiple read markings for same message

## Success Metrics

### Primary Metrics
- **Read Receipt Accuracy**: 99%+ accuracy in read status tracking
- **Real-Time Performance**: Read status updates within 1 second
- **Reduced Follow-ups**: 50% reduction in "Did you see my message?" follow-ups
- **User Confidence**: Increased message sending confidence (survey metric)

### Secondary Metrics
- **System Performance**: No degradation in message sending/receiving speed
- **Offline Reliability**: 100% offline read marking accuracy
- **Group Chat Usage**: Increased group chat engagement due to read visibility
- **Error Rate**: <1% read marking failures

### Testing Criteria
- **Functional Testing**: Read receipts work correctly in individual and group chats
- **Real-Time Testing**: Status updates appear immediately across devices
- **Offline Testing**: Offline read marking works when connection restored
- **Performance Testing**: No UI lag during read status updates
- **Edge Case Testing**: Handles rapid chat switching and network interruptions

## Open Questions

1. **Batch Size**: What's the optimal batch size for marking multiple messages as read?
2. **Scroll Threshold**: Should messages be marked as read when scrolled into view or only when chat opens?
3. **Group Participant Changes**: How should read counts update when users leave/join groups?
4. **Message Deletion**: Should read receipts be preserved when messages are deleted?
5. **Performance Monitoring**: Should we track read marking performance metrics?
6. **Future Enhancement**: Should the system accommodate future privacy controls?

## Implementation Notes

### Component Updates
- **ChatScreen**: Add `markMessagesAsRead` call on component mount
- **MessageBubble**: Update `getStatusColor` function for blue read checkmarks
- **MessageList**: Add read marking when messages scroll into view
- **useMessages**: Integrate automatic read marking with message loading

### Service Integration
- **MessagingService**: Enhance `markMessagesAsRead` for batch operations
- **ChatService**: Add read status tracking to chat metadata
- **PresenceService**: Coordinate with presence system for accurate read tracking

### Database Schema
- **Messages Collection**: Add `readBy` field for tracking read status
- **Chats Collection**: Add `lastReadBy` field for participant read tracking
- **SQLite Cache**: Store read status locally for offline scenarios

### Testing Strategy
- **Unit Tests**: Test read marking logic and status updates
- **Integration Tests**: Test real-time read receipt updates
- **E2E Tests**: Test complete read receipt flow across devices
- **Performance Tests**: Test read marking performance with large message counts
- **Offline Tests**: Test offline read marking and sync scenarios
