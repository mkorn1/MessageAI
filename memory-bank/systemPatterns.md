# System Patterns: MessageAI Architecture

## Core Architecture Principles

### 1. Reliability-First Design
- **Optimistic UI**: Messages appear instantly, then confirm delivery
- **Offline-First**: All data stored locally, synced when online
- **Graceful Degradation**: App works fully offline, syncs when possible

### 2. Real-Time Synchronization
- **Firestore Listeners**: Real-time message updates across devices
- **Presence System**: Online/offline status tracking
- **Typing Indicators**: Live typing status updates

### 3. Data Flow Architecture
```
User Input → Optimistic UI → Local SQLite → Firebase Firestore → Real-time Sync → Other Devices
```

## Key Technical Patterns

### Message State Machine
```
pending → sending → sent → delivered → read
```
- **Pending**: Queued for send (offline)
- **Sending**: Optimistic UI state (clock icon)
- **Sent**: Server confirmed (single checkmark)
- **Delivered**: Recipient device received (double gray checkmarks)
- **Read**: Recipient opened chat (double blue checkmarks)

### Data Storage Strategy
- **Firestore**: Source of truth, real-time sync
- **SQLite**: Local cache, offline access
- **Sync Strategy**: Firestore document IDs as SQLite primary keys
- **Conflict Resolution**: Firestore wins, SQLite is cache

### Authentication Pattern
- **Phone Number Auth**: Universal access, no passwords
- **SMS Verification**: Firebase Auth flow
- **Profile Setup**: Manual display name and photo upload
- **Session Persistence**: Stay logged in across app restarts

### Group Chat Architecture
- **Firestore Subcollections**: `/groups/{groupId}/messages/{messageId}`
- **Member Management**: Simple participant list
- **Read Receipts**: Count-based ("Read by 2 of 3")
- **Message Attribution**: Sender name and avatar per message

## Component Patterns

### Chat UI Components
- **MessageList**: FlatList with pagination (50 messages at a time)
- **MessageBubble**: Differentiated styling for sender/receiver
- **MessageInput**: Text input with send button and media options
- **TypingIndicator**: "User is typing..." with timeout

### State Management
- **React Context**: User authentication state
- **Local State**: Chat UI state, typing indicators
- **Firestore State**: Real-time message data
- **SQLite State**: Offline message cache

### Error Handling Patterns
- **Network Errors**: Retry logic with exponential backoff
- **Offline State**: Queue messages, sync on reconnect
- **Error Boundaries**: Graceful component failure handling
- **User Feedback**: Clear error states with retry options

## Performance Patterns

### Message Rendering
- **FlatList Optimization**: Proper key extraction and item sizing
- **Pagination**: Load 50 messages, "Load more" on scroll up
- **Image Compression**: Automatic resize to 1024px width
- **Thumbnail Display**: Show compressed images in chat

### Real-Time Efficiency
- **Single Listener**: One Firestore listener per active chat
- **Presence Optimization**: Update status every 5 seconds max
- **Typing Debounce**: 3-second timeout for typing indicators
- **Message Batching**: Group rapid messages for better performance

## Security Patterns

### Data Protection
- **Firestore Rules**: User-based access control
- **Phone Verification**: SMS-based authentication
- **Profile Privacy**: Users control their display information
- **Message Privacy**: Only participants can access group messages

### API Security
- **Firebase Auth**: Handles all authentication
- **Firestore Security Rules**: Server-side validation
- **No Direct API**: All data flows through Firebase services

## Testing Patterns

### Component Testing
- **Message State Tests**: Verify state machine transitions
- **Offline Tests**: Airplane mode simulation
- **Real-Time Tests**: Multi-device message flow
- **Error Tests**: Network failure scenarios

### Integration Testing
- **Firebase Auth Flow**: Phone number verification
- **SQLite Persistence**: Message storage and retrieval
- **Firestore Sync**: Real-time updates
- **Push Notifications**: Foreground notification delivery
