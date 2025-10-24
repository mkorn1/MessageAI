# Push Notifications Feature Task List

## Relevant Files

### New Files to Create
- `functions/index.js` - Firebase Cloud Functions for notification triggering
- `functions/package.json` - Cloud Functions dependencies
- `src/services/notificationService.test.ts` - Unit tests for notification service
- `src/utils/notificationUtils.ts` - Notification utility functions
- `src/utils/notificationUtils.test.ts` - Unit tests for notification utilities
- `src/types/notification.ts` - Notification type definitions
- `firebase.json` - Firebase configuration for Cloud Functions

### Existing Files to Modify/Integrate
- `src/services/notificationService.ts` - Client-side notification management (already exists)
- `src/components/NotificationPermissionsModal.tsx` - Existing permission request UI
- `src/hooks/useNotificationPermissions.ts` - Existing permission state management
- `src/contexts/AuthContext.tsx` - Already handles notification service initialization

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests
- Cloud Functions require Firebase CLI for deployment
- Expo Go has limitations for push notifications testing

## Tasks

- [x] 1. Set up Firebase Cloud Functions and FCM infrastructure
  - [x] 1.1 Create Firebase Cloud Functions project directory (`functions/`)
  - [x] 1.2 Initialize Cloud Functions with `firebase init functions`
  - [x] 1.3 Install FCM Admin SDK dependency (`firebase-admin`)
  - [x] 1.4 Create Cloud Function for message onCreate trigger
  - [x] 1.5 Implement recipient status checking using existing presence system
  - [x] 1.6 Build notification payload with chat navigation data
  - [x] 1.7 Add FCM token validation and error handling
  - [x] 1.8 Deploy Cloud Functions to Firebase
  - [ ] 1.9 Test Cloud Function with Firebase Console

- [ ] 2. Implement client-side notification service and token management
  - [x] 2.1 Install expo-notifications dependency
  - [x] 2.2 Create NotificationService class for FCM token management
  - [x] 2.3 Implement token registration on app launch
  - [x] 2.4 Add token refresh handling and error recovery
  - [x] 2.5 Integrate token storage with existing Firestore user documents
  - [x] 2.6 Verify existing notification permissions request flow (NotificationPermissionsModal)
  - [x] 2.7 Configure foreground notification handler
  - [x] 2.8 Add notification tap handling for navigation
  - [x] 2.9 Ensure permission status syncs with existing useNotificationPermissions hook

- [ ] 3. Integrate notification state management with existing systems
  - [x] 3.1 Add active chat tracking using Expo Router navigation state
  - [x] 3.2 Create notification preferences state management
  - [x] 3.3 Implement app state tracking (foreground/background)
  - [x] 3.4 Create notification utility functions for formatting
  - [x] 3.5 Add error handling and retry logic for failed notifications

- [ ] 4. Integrate notifications with existing messaging and navigation systems
  - [x] 4.1 Update MessagingService to trigger notification checks
  - [x] 4.2 Integrate with existing useMessages hook for message events
  - [x] 4.3 Connect with usePresence hook for online status checking
  - [x] 4.4 Update ChatScreen to track active chat state
  - [x] 4.5 Verify notification service initialization in AuthContext (already implemented)
  - [x] 4.6 Add deep linking support for notification navigation
  - [x] 4.7 Update existing navigation to handle notification routes
  - [x] 4.8 Implement smart suppression logic (no notification in active chat)
  - [x] 4.9 Add group chat notification support with proper naming
  - [x] 4.10 Integrate foreground notification handler with existing NotificationPermissionsModal flow

- [ ] 5. Test notifications on physical devices and handle edge cases
  - [x] 5.1 Test existing notification permissions modal flow on iOS device via Expo Go
  - [ ] 5.2 Test existing notification permissions modal flow on Android device via Expo Go
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
  - [ ] 5.13 Ensure notification tap navigation respects active chat tracking
