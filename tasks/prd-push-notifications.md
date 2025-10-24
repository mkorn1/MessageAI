# Push Notifications Feature PRD - MessageAI

## Feature Overview
**Feature Name:** Push Notifications  
**Priority:** High (MVP Requirement)  
**Timeline:** Phase 6 (Hours 22-24)  
**Scope:** Smart MVP - Foreground notifications with smart suppression and group support
**Implementation:** Simplest solution that functions (Option B)

---

## User Stories

### Primary User: Busy Parent/Caregiver (Sarah, 35)
**As Sarah, I want to:**
1. Receive immediate notification when I receive a message while using the app (but not in that specific chat) so I don't miss important updates
2. See who sent the message and a preview of what they said so I can prioritize my response
3. Tap the notification to instantly open the correct chat so I can respond quickly
4. Not be interrupted by notifications when I'm already reading messages in that specific chat
5. Trust that notifications work reliably so I don't miss urgent family communications

### Secondary User: Partner/Family Member (Mike, 37)
**As Mike, I want to:**
1. Know that Sarah will see my message notification even if she's using another app
2. Have confidence that urgent messages will get Sarah's attention immediately
3. Not spam Sarah with notifications when she's already actively chatting with me

---

## Feature Requirements

### MVP Scope: Smart Foreground Notifications (Option B)

#### Core Functionality
- **Notification Trigger:** New message received while app is open but not in the active chat
- **Notification Display:** Banner notification at top of screen with sender name and message preview
- **Notification Action:** Tap notification opens the specific chat where message was sent
- **Smart Suppression:** No notification if user is already viewing that specific chat
- **Group Chat Support:** Notifications work for both 1x1 and group chats
- **Real-time Delivery:** Notification appears within 1 second of message receipt

#### Technical Requirements
- **Platform Support:** iOS and Android via Expo Go + Firebase Cloud Messaging (no Apple Developer account required)
- **Message Preview:** Show first 50 characters of message text
- **Sender Identification:** Display sender's display name (not phone number)
- **Chat Navigation:** Deep link to specific chat conversation using existing Expo Router `/chat` route
- **Permission Handling:** Graceful degradation if user denies notification permissions
- **Integration:** Leverage existing `useMessages`, `usePresence`, and `MessagingService` architecture

#### Notification Content Format
```
Title: "New message from [Sender Name]"
Body: "[Message preview - first 50 chars]..."
Action: Tap to open chat
```

#### Group Chat Behavior
- **Notification Title:** "New message in [Group Name]"
- **Notification Body:** "[Sender Name]: [Message preview]"
- **Smart Grouping:** Show latest sender name for context

### Post-MVP Scope: Background Notifications (Future)

#### Background Notification Features (Not in MVP)
- **Killed App Notifications:** Notify when app is completely closed
- **Background App Notifications:** Notify when app is minimized/backgrounded
- **Notification Preferences:** User settings for notification behavior
- **Quiet Hours:** Scheduled notification suppression
- **Custom Sounds:** Different notification sounds per chat/user
- **Notification Actions:** Quick reply, mark as read from notification
- **Badge Count:** Unread message count on app icon

---

## Technical Architecture

### System Components

#### 1. Firebase Cloud Functions
```typescript
// Trigger: New message created in Firestore
exports.sendMessageNotification = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    // Implementation details in technical spec
  });
```

**Responsibilities:**
- Detect new message creation
- Fetch recipient's FCM token and online status
- Check if recipient is in active chat
- Build notification payload
- Send notification via FCM Admin SDK

#### 2. FCM Token Management
**Storage:** Firestore `users/{userId}` document
```typescript
interface UserDocument {
  fcmToken: string;
  lastTokenUpdate: Timestamp;
  notificationPreferences: {
    enabled: boolean;
    foregroundOnly: boolean; // MVP: always true
  };
}
```

**Token Lifecycle:**
- Register token on app launch
- Update token on auth state change
- Refresh token when expired
- Remove token on logout

#### 3. Expo Notifications Integration
**Foreground Handler:**
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // MVP: no badge count
  }),
});
```

**Notification Response Handler:**
- Parse notification data for chat navigation
- Navigate to specific chat screen
- Mark message as read if needed

#### 4. App State Management
**Active Chat Tracking:**
- Track currently active chat ID
- Update when user navigates between chats
- Reset when app goes to background

**App State Detection:**
- Foreground/background state changes
- Chat screen visibility
- Notification permission status

### Data Flow

```
1. User A sends message to User B
2. Message saved to Firestore
3. Cloud Function triggered (message onCreate)
4. Function checks User B's status:
   - Is User B online?
   - Is User B in active chat with User A?
   - Does User B have valid FCM token?
5. If conditions met → Send FCM notification
6. User B's device receives notification
7. Expo Notifications displays banner
8. User B taps notification
9. App navigates to specific chat
10. Message marked as read (if applicable)
```

---

## User Experience Design

### Notification Appearance

#### iOS Notification Banner
- **Position:** Top of screen, below status bar
- **Duration:** 5 seconds auto-dismiss
- **Style:** System notification banner
- **Sound:** Default notification sound
- **Vibration:** Standard notification vibration

#### Android Notification
- **Position:** Top of screen
- **Duration:** 5 seconds auto-dismiss
- **Style:** Heads-up notification
- **Sound:** Default notification sound
- **Vibration:** Standard notification vibration

### Notification Content Examples

#### One-on-One Chat
```
Title: "New message from Mike"
Body: "Can you pick up Emma from soccer practice at 4pm?"
```

#### Group Chat
```
Title: "New message in Family Chat"
Body: "Sarah: The kids are ready for pickup!"
```

#### Long Message Preview
```
Title: "New message from School Admin"
Body: "Reminder: Parent-teacher conferences are scheduled for next week. Please check your email for your assigned time slot. If you need to reschedule, please contact..."
```

### Edge Cases & Error Handling

#### Permission Denied
- **Behavior:** Silent failure, no notification sent
- **User Feedback:** None (don't interrupt user experience)
- **Recovery:** User can enable in Settings app

#### Invalid FCM Token
- **Behavior:** Log error, attempt token refresh
- **Recovery:** Update token on next app launch
- **Fallback:** None (notification simply won't be sent)

#### Network Failure
- **Behavior:** FCM handles retry automatically
- **User Impact:** Minimal (notification may be delayed)
- **Recovery:** Automatic retry by FCM service

#### App Crashed/Force Quit
- **Behavior:** No notification (MVP limitation)
- **Future:** Background notifications will handle this

---

## Implementation Plan

### Phase 1: Foundation Setup (Hour 22, Part 1) - 1 hour
**Goal:** Basic FCM integration and token management

**Tasks:**
1. **Firebase Cloud Functions Setup**
   - Create Cloud Function project
   - Install FCM Admin SDK
   - Set up function deployment pipeline

2. **FCM Token Management**
   - Add token field to user documents in Firestore
   - Implement token registration on app launch
   - Handle token refresh and updates
   - Integrate with existing `AuthContext`

3. **Expo Notifications Configuration**
   - Install and configure expo-notifications
   - Set up notification permissions request
   - Configure foreground notification handler

**Success Criteria:**
- FCM tokens stored in Firestore user documents
- App requests notification permissions on first launch
- Foreground notification handler configured

### Phase 2: Notification Triggering (Hour 22, Part 2) - 1 hour
**Goal:** Cloud Function sends notifications on new messages

**Tasks:**
1. **Cloud Function Implementation**
   - Create message onCreate trigger in Firestore
   - Implement recipient status checking using existing presence system
   - Build notification payload with chat navigation data
   - Send notification via FCM Admin SDK

2. **Active Chat Detection**
   - Create active chat tracking system using Expo Router navigation state
   - Pass active chat info to Cloud Function via user document
   - Implement smart notification suppression

3. **Notification Payload Structure**
   - Define notification data format for chat navigation
   - Include chat ID for deep linking to existing `/chat` route
   - Include sender information from existing user system

**Success Criteria:**
- Cloud Function triggers on new message creation
- Notifications sent only when appropriate (not in active chat)
- Notification contains correct chat navigation data

### Phase 3: Notification Handling (Hour 23, Part 1) - 1 hour
**Goal:** App receives and handles notifications properly

**Tasks:**
1. **Notification Reception**
   - Handle incoming FCM notifications
   - Parse notification data
   - Display notification banner using Expo Notifications

2. **Navigation Integration**
   - Handle notification tap events
   - Navigate to specific chat using existing Expo Router
   - Integrate with existing `ChatScreen` component

3. **App State Management**
   - Track app foreground/background state
   - Track active chat screen using navigation state
   - Update Cloud Function with current state via user document

**Success Criteria:**
- Notifications appear as banners when app is open
- Tapping notification opens correct chat using existing navigation
- No notifications when user is in active chat

### Phase 4: Testing & Polish (Hour 23, Part 2) - 1 hour
**Goal:** Thorough testing and edge case handling

**Tasks:**
1. **Device Testing**
   - Test on physical iOS device via Expo Go
   - Test on physical Android device via Expo Go
   - Test notification permissions flow

2. **Edge Case Testing**
   - Test with notification permissions denied
   - Test with invalid FCM tokens
   - Test rapid-fire message notifications
   - Test group chat notifications

3. **User Experience Polish**
   - Optimize notification timing
   - Refine notification content formatting
   - Handle long message previews gracefully

**Success Criteria:**
- All notification scenarios work on both platforms via Expo Go
- Edge cases handled gracefully
- User experience is smooth and intuitive

---

## Expo Go Limitations & Constraints

### Testing Environment
- **No Apple Developer Account:** Must use Expo Go for iOS testing
- **Expo Go Push Notifications:** Limited to foreground notifications only
- **Background Notifications:** Not supported in Expo Go (requires TestFlight/App Store)
- **FCM Token Management:** Works in Expo Go but with limitations

### MVP Scope Adjustments
- **Foreground Only:** Perfect for MVP requirements
- **Expo Go Compatible:** All features work within Expo Go limitations
- **Future Deployment:** Background notifications require TestFlight/App Store deployment

---

## Success Criteria

### MVP Requirements (Must Pass)
- [ ] Foreground notifications appear when app is open but not in active chat
- [ ] Notification shows sender name and message preview
- [ ] Tapping notification opens the correct chat using existing Expo Router
- [ ] No notification appears when user is already in that specific chat
- [ ] Notifications work on both iOS and Android via Expo Go
- [ ] Notification appears within 1 second of message receipt
- [ ] Group chat notifications show group name and sender
- [ ] App handles notification permission denial gracefully
- [ ] Integration with existing `useMessages`, `usePresence`, and `MessagingService`

### Testing Checklist
1. **Basic Notification Flow**
   - [ ] Send message from Device A to Device B
   - [ ] Device B shows notification banner (app open, not in chat)
   - [ ] Tap notification → opens correct chat
   - [ ] Message appears in chat

2. **Smart Suppression**
   - [ ] Device B is in active chat with Device A
   - [ ] Send message from Device A
   - [ ] Device B shows NO notification (suppressed correctly)

3. **Group Chat Notifications**
   - [ ] Send message in group chat
   - [ ] Notification shows group name and sender
   - [ ] Tap notification → opens group chat

4. **Permission Handling**
   - [ ] Deny notification permissions
   - [ ] Send message → no notification (graceful degradation)
   - [ ] Re-enable permissions → notifications work

5. **Cross-Platform**
   - [ ] Test on iOS physical device
   - [ ] Test on Android physical device
   - [ ] Both platforms show notifications correctly

---

## Future Enhancements (Post-MVP)

### Background Notifications (Phase 2)
- Notifications when app is backgrounded or killed
- Persistent notification tray
- Notification history

### User Preferences (Phase 3)
- Notification settings screen
- Mute specific chats
- Custom notification sounds
- Quiet hours configuration

### Advanced Features (Phase 4)
- Notification actions (quick reply, mark as read)
- Smart notification grouping
- AI-powered priority detection
- Badge count on app icon

### Integration Features (Phase 5)
- Apple Watch notifications
- Android Wear notifications
- Desktop notification support
- Web push notifications

---

## Technical Dependencies

### Required Services
- **Firebase Cloud Functions:** Server-side notification triggering
- **Firebase Cloud Messaging:** Push notification delivery
- **Expo Notifications:** Client-side notification handling
- **Firestore:** User data and FCM token storage

### Required Permissions
- **iOS:** Push Notifications permission
- **Android:** POST_NOTIFICATIONS permission (API 33+)

### Development Requirements
- **Physical Devices:** Notifications don't work in simulators
- **Apple Developer Account:** For iOS push notifications
- **Google Play Console:** For Android push notifications (post-MVP)

---

## Risk Mitigation

### Technical Risks
1. **FCM Token Management**
   - **Risk:** Tokens expire or become invalid
   - **Mitigation:** Implement token refresh on app launch and auth changes

2. **Cloud Function Performance**
   - **Risk:** Function cold starts cause notification delays
   - **Mitigation:** Keep function warm with scheduled triggers

3. **Cross-Platform Differences**
   - **Risk:** iOS and Android notification behavior differs
   - **Mitigation:** Test on both platforms early and often

### User Experience Risks
1. **Notification Spam**
   - **Risk:** Too many notifications annoy users
   - **Mitigation:** Smart suppression when in active chat

2. **Permission Denial**
   - **Risk:** Users deny notification permissions
   - **Mitigation:** Graceful degradation, no interruption to core messaging

3. **Navigation Issues**
   - **Risk:** Notification tap doesn't open correct chat
   - **Mitigation:** Thorough testing of deep linking and navigation

---

## Definition of Done

### Development Complete
- [ ] Cloud Function deployed and working
- [ ] FCM token management implemented
- [ ] Foreground notification handler working
- [ ] Notification navigation working
- [ ] All edge cases handled

### Testing Complete
- [ ] Tested on iOS physical device
- [ ] Tested on Android physical device
- [ ] All success criteria verified
- [ ] Edge cases tested and working
- [ ] No critical bugs identified

### Documentation Complete
- [ ] Technical implementation documented
- [ ] User experience flows documented
- [ ] Troubleshooting guide created
- [ ] Future enhancement roadmap defined

---

## Next Steps

1. **Review and Approve PRD**
   - Stakeholder review of requirements
   - Technical feasibility confirmation
   - Timeline validation

2. **Technical Planning**
   - Detailed technical specification
   - Cloud Function architecture design
   - Testing strategy definition

3. **Implementation Start**
   - Begin Phase 1: Foundation Setup
   - Set up development environment
   - Start FCM token management implementation

4. **Testing Preparation**
   - Identify test devices (iOS + Android)
   - Set up Firebase Cloud Functions project
   - Prepare notification testing scenarios

This PRD provides a comprehensive foundation for implementing push notifications in MessageAI, with clear focus on foreground notifications for the MVP while establishing the architecture for future background notification enhancements.
