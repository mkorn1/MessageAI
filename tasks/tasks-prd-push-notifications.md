# Push Notifications Feature Task List

## Relevant Files

- `functions/index.js` - Firebase Cloud Functions for notification triggering
- `functions/package.json` - Cloud Functions dependencies
- `src/services/notificationService.ts` - Client-side notification management
- `src/services/notificationService.test.ts` - Unit tests for notification service
- `src/hooks/useNotifications.ts` - React hook for notification state management
- `src/hooks/useNotifications.test.ts` - Unit tests for notification hook
- `src/contexts/NotificationContext.tsx` - Notification context provider
- `src/contexts/NotificationContext.test.tsx` - Unit tests for notification context
- `src/utils/notificationUtils.ts` - Notification utility functions
- `src/utils/notificationUtils.test.ts` - Unit tests for notification utilities
- `app/_layout.tsx` - Root layout with notification setup
- `src/types/notification.ts` - Notification type definitions
- `firebase.json` - Firebase configuration for Cloud Functions

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests
- Cloud Functions require Firebase CLI for deployment
- Expo Go has limitations for push notifications testing

## Tasks

- [ ] 1. Set up Firebase Cloud Functions and FCM infrastructure
  - [ ] 1.1 Create Firebase Cloud Functions project directory (`functions/`)
  - [ ] 1.2 Initialize Cloud Functions with `firebase init functions`
  - [ ] 1.3 Install FCM Admin SDK dependency (`firebase-admin`)
  - [ ] 1.4 Create Cloud Function for message onCreate trigger
  - [ ] 1.5 Implement recipient status checking using existing presence system
  - [ ] 1.6 Build notification payload with chat navigation data
  - [ ] 1.7 Add FCM token validation and error handling
  - [ ] 1.8 Deploy Cloud Functions to Firebase
  - [ ] 1.9 Test Cloud Function with Firebase Console

- [ ] 2. Implement client-side notification service and token management
  - [ ] 2.1 Install expo-notifications dependency
  - [ ] 2.2 Create NotificationService class for FCM token management
  - [ ] 2.3 Implement token registration on app launch
  - [ ] 2.4 Add token refresh handling and error recovery
  - [ ] 2.5 Integrate token storage with existing Firestore user documents
  - [ ] 2.6 Set up notification permissions request flow
  - [ ] 2.7 Configure foreground notification handler
  - [ ] 2.8 Add notification tap handling for navigation
  - [ ] 2.9 Implement notification permission status tracking

- [ ] 3. Create notification context and React hooks for state management
  - [ ] 3.1 Create NotificationContext provider component
  - [ ] 3.2 Implement useNotifications hook for notification state
  - [ ] 3.3 Add active chat tracking using Expo Router navigation state
  - [ ] 3.4 Create notification preferences state management
  - [ ] 3.5 Implement app state tracking (foreground/background)
  - [ ] 3.6 Add notification permission status to context
  - [ ] 3.7 Create notification utility functions for formatting
  - [ ] 3.8 Add error handling and retry logic for failed notifications
  - [ ] 3.9 Integrate context with existing AuthContext

- [ ] 4. Integrate notifications with existing messaging and navigation systems
  - [ ] 4.1 Update MessagingService to trigger notification checks
  - [ ] 4.2 Integrate with existing useMessages hook for message events
  - [ ] 4.3 Connect with usePresence hook for online status checking
  - [ ] 4.4 Update ChatScreen to track active chat state
  - [ ] 4.5 Modify app/_layout.tsx to initialize notification system
  - [ ] 4.6 Add deep linking support for notification navigation
  - [ ] 4.7 Update existing navigation to handle notification routes
  - [ ] 4.8 Implement smart suppression logic (no notification in active chat)
  - [ ] 4.9 Add group chat notification support with proper naming

- [ ] 5. Test notifications on physical devices and handle edge cases
  - [ ] 5.1 Test notification permissions flow on iOS device via Expo Go
  - [ ] 5.2 Test notification permissions flow on Android device via Expo Go
  - [ ] 5.3 Test basic notification flow (send message → receive notification)
  - [ ] 5.4 Test smart suppression (no notification when in active chat)
  - [ ] 5.5 Test group chat notifications with multiple participants
  - [ ] 5.6 Test notification tap navigation to correct chat
  - [ ] 5.7 Test edge cases: permission denied, invalid tokens, network failures
  - [ ] 5.8 Test rapid-fire message notifications
  - [ ] 5.9 Test notification content formatting and message preview truncation
  - [ ] 5.10 Verify notification timing (appears within 1 second)
  - [ ] 5.11 Test app lifecycle handling (foreground/background transitions)
  - [ ] 5.12 Document any Expo Go limitations encountered
