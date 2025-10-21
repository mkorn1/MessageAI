# Tasks: Minimum Viable Message (Milestone 1.1)

## Relevant Files

- `src/screens/LoginScreen.tsx` - Multi-method authentication screen (email, Google, Facebook, phone)
- `src/screens/LoginScreen.test.tsx` - Unit tests for LoginScreen component
- `src/screens/FirebaseTestScreen.tsx` - Firebase connection and authentication testing screen
- `src/screens/FirebaseTestScreen.test.tsx` - Unit tests for FirebaseTestScreen component
- `src/screens/ChatScreen.tsx` - Main chat interface component with message list and input field
- `src/screens/ChatScreen.test.tsx` - Unit tests for ChatScreen component
- `src/components/MessageList.tsx` - Component for displaying messages in a scrollable list
- `src/components/MessageList.test.tsx` - Unit tests for MessageList component
- `src/components/MessageInput.tsx` - Component for text input and send button
- `src/components/MessageInput.test.tsx` - Unit tests for MessageInput component
- `src/components/MessageBubble.tsx` - Individual message display component
- `src/components/MessageBubble.test.tsx` - Unit tests for MessageBubble component
- `src/services/messaging.ts` - Service for Firebase Firestore message operations
- `src/services/messaging.test.ts` - Unit tests for messaging service
- `src/services/auth.ts` - Multi-method authentication service (email, Google, Facebook, phone)
- `src/services/auth.test.ts` - Unit tests for auth service
- `src/types/message.ts` - TypeScript interfaces for Message data model
- `src/hooks/useMessages.ts` - Custom hook for message state management
- `src/hooks/useMessages.test.ts` - Unit tests for useMessages hook
- `src/utils/errorHandling.ts` - Error handling utilities for Firebase failures
- `src/utils/errorHandling.test.ts` - Unit tests for error handling utilities
- `firebase.js` - Firebase configuration with web SDK
- `firestore.rules` - Firestore security rules

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `ChatScreen.tsx` and `ChatScreen.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

### Authentication Methods Status

- **Email Authentication**: ✅ Fully functional in Expo Go/web
- **Google Authentication**: ✅ Fully functional in Expo Go/web  
- **Facebook Authentication**: ✅ Fully functional in Expo Go/web
- **Phone Authentication**: ⚠️ Requires native compilation (TestFlight/APK) - not available in Expo Go
- **Firebase Connection**: ✅ Fully functional and tested

## Tasks

- [x] 1 Firebase Project Setup & Multi-Method Authentication Integration
  - [x] 1.1 Create Firebase project and configure Firestore database
  - [x] 1.2 Enable Firebase Authentication with multiple sign-in methods (email, Google, Facebook, phone)
  - [x] 1.3 Update firebase.js with actual project credentials and web SDK
  - [x] 1.4 Test Firebase connection and authentication flow
  - [x] 1.5 Implement comprehensive login screen with multiple authentication options
  - [x] 1.6 Implement email sign-up and sign-in functionality
  - [x] 1.7 Implement Google authentication with popup sign-in
  - [x] 1.8 Implement Facebook authentication with popup sign-in
  - [x] 1.9 Implement SMS verification code flow (phone authentication)
  - [x] 1.10 Create user document in Firestore on successful authentication (all methods)
  - [x] 1.11 Handle authentication state persistence across app restarts

- [x] 2 Message Data Model & TypeScript Interfaces
  - [x] 2.1 Create Message interface with id, text, senderId, timestamp, chatId
  - [x] 2.2 Create User interface for authentication data (includes email, phone, displayName, photoURL)
  - [x] 2.3 Create Chat interface for chat/room identification
  - [x] 2.4 Create error handling types for Firebase failures
  - [x] 2.5 Export all interfaces from centralized types/index.ts file

- [x] 3 Core Messaging Service Implementation
  - [x] 3.1 Create messaging service with Firebase Firestore integration
  - [x] 3.2 Implement sendMessage function to save messages to Firestore
  - [x] 3.3 Implement getMessages function to retrieve messages from Firestore
  - [x] 3.4 Implement real-time message listener using onSnapshot
  - [x] 3.5 Add error handling for Firebase unavailability
  - [x] 3.6 Implement message validation and sanitization
  - [x] 3.7 Add proper Firestore security rules for messages collection

- [x] 4 Chat UI Components Development
  - [x] 4.1 Create MessageBubble component with sent/received styling
  - [x] 4.2 Create MessageList component with FlatList for scrollable messages
  - [x] 4.3 Create MessageInput component with text input and send button
  - [x] 4.4 Create ChatScreen component integrating all chat components
  - [x] 4.5 Implement Tailwind CSS styling for clean, familiar chat UI
  - [x] 4.6 Add auto-scroll to bottom functionality for new messages
  - [x] 4.7 Implement message timestamp display
  - [ ] 4.8 Add loading states and error message display

- [ ] 5 Real-Time Message Integration & Testing
  - [x] 5.1 Create useMessages custom hook for message state management
  - [ ] 5.2 Integrate real-time Firestore listener in ChatScreen
  - [x] 5.3 Implement optimistic UI updates for sent messages
  - [ ] 5.4 Test message sending from Device A to Device B
  - [ ] 5.5 Test message appears on sender's screen immediately
  - [ ] 5.6 Test message appears on receiver's screen within 1 second
  - [ ] 5.7 Test message visibility in Firebase Console
  - [ ] 5.8 Test error handling when Firebase is unavailable
