# MessageAI MVP - Product Requirements Document

## Project Overview
**Target Persona:** Busy Parent/Caregiver  
**Timeline:** 24 hours to MVP  
**Platform:** React Native with Expo  
**Core Value Proposition:** Reliable real-time messaging with offline support, built as foundation for AI-enhanced communication

---

## User Stories

### Primary User: Busy Parent/Caregiver (Sarah, 35)
Sarah juggles two kids' schedules, coordinates with her partner, manages school communications, and organizes playdates. She needs messaging that works reliably even when connectivity is spotty (school pickup zones, indoor playgrounds).

**As a busy parent, I want to:**
1. Send messages instantly to my partner/family so they receive updates even when I'm in a rush
2. See my message history when offline so I can reference important information (pickup times, medication doses) without internet
3. Know if my message was delivered and read so I don't have to follow up with "Did you see my message?"
4. See when someone is typing so I know to wait for their response before making a decision
5. Send photos quickly (kids' drawings, permission slips, outfit choices) without complicated steps
6. Chat in group conversations with other parents, school, or family members
7. Receive notifications even when the app is closed so I don't miss urgent messages
8. Trust that my messages will send even if my connection drops mid-send

### Secondary User: Partner/Family Member (Mike, 37)
**As Sarah's partner, I want to:**
1. Respond to messages in real-time so Sarah knows I've got it handled
2. See group chats with school/caregivers so I'm in the loop
3. Share my online/offline status so Sarah knows if I'm available

---

## Key Features for MVP (24 Hour Checkpoint)

### 1. Core Messaging Infrastructure ✅

#### One-on-One Chat
- Text message input field with send button
- Message display with sender identification
- Timestamp for each message (e.g., "2:34 PM")
- Message bubble UI (sender vs. receiver styling)
- Scroll to bottom on new message
- Message history loads last 50 messages (with "Load more" button if user scrolls to top)

#### Real-Time Message Delivery
- Messages appear instantly for online recipients (< 1 second latency)
- WebSocket or Firestore real-time listeners for live updates
- No manual refresh required
- Messages sync across multiple devices

#### Message Persistence
- All messages stored in local SQLite database (Expo SQLite)
- Chat history survives app restart/force quit
- Messages remain accessible offline
- Local cache syncs with server when online

#### Optimistic UI Updates
- Message appears immediately in sender's chat when "Send" pressed
- Visual indicator while message is sending (e.g., clock icon)
- Confirmation when server receives message (e.g., single checkmark)
- Error state if send fails with retry option
- No "frozen" UI while waiting for server response

### 2. Presence & Status Indicators ✅

#### Online/Offline Status
- Green dot indicator when user is online/active
- Gray indicator when offline
- Status updates within 5 seconds of connectivity change
- Display in chat header and contact list

#### Typing Indicators
- "Mike is typing..." appears when other user is actively typing
- Disappears after 3 seconds of inactivity or when message sent
- Only visible in active conversation

### 3. Message States & Receipts ✅

#### Delivery States
- **Sending:** Clock icon (optimistic, not yet confirmed)
- **Sent:** Single gray checkmark (server received)
- **Delivered:** Double gray checkmarks (recipient's device received)
- **Read:** Double blue checkmarks (recipient opened chat and saw message)

#### Read Receipts
- Automatically mark messages as "read" when user opens chat
- Timestamp of when message was read (optional to display)
- Works in both one-on-one and group chats

### 4. Group Chat Functionality ✅

#### Core Group Features
- Create group with 3+ participants
- Add participants by selecting from all app users
- User-defined group name/title
- All messages show sender's name/avatar
- Read receipts show count (e.g., "Read by 2 of 3")
- Same real-time delivery as one-on-one

#### Message Attribution
- Each message clearly shows sender's display name
- Profile picture/avatar for each sender
- Differentiated message bubble colors per sender (optional)

### 5. Authentication & User Profiles ✅

#### User Authentication
- Firebase Authentication with Phone Number Sign-In
- SMS verification code flow (no passwords required)
- Sign up automatically creates profile
- Session persistence (stay logged in)
- Logout functionality
- Profile requires manual setup (display name, photo)

#### User Profiles
- Display name (user-defined during setup)
- Profile picture/avatar (custom upload via ImagePicker)
- Phone number (from authentication)
- Profile viewable by other users
- Edit profile: Change display name or upload new photo

### 6. Push Notifications ✅

#### Notification Requirements (MVP)
- **Foreground notifications ONLY:** Alert when message received while app is open/active
- Push notification setup using Expo Notifications + Firebase Cloud Messaging (FCM)
- Notification displays sender name and message preview
- Banner notification appears at top of screen when app is in foreground
- **Background/killed app notifications:** Post-MVP (Day 2-7)

**Note:** This is acceptable per MVP requirements. Focus on reliable foreground notifications first.

### 7. Media Support (Basic) ✅

#### Image Sharing
- Camera roll/gallery access via Expo ImagePicker
- Select and send images
- **Image compression:** Use `expo-image-manipulator` to resize to max 1024px width (maintains quality, reduces upload time/storage)
- Images display in chat with thumbnail
- Tap to view full-size image
- Images persist locally and sync to Firebase Storage
- Show upload progress indicator

**Note:** Advanced media (video, voice messages) are post-MVP.

### 8. Deployment ✅

#### MVP Deployment Target
- Local emulator/simulator with deployed Firebase backend
- Expo Go deployment (if time permits)
- TestFlight/APK not required for 24-hour MVP but strongly encouraged

---

## Tech Stack

### Backend
- **Firebase Firestore:** Real-time message sync, user data
- **Firebase Cloud Functions:** Serverless backend (for AI features post-MVP)
- **Firebase Authentication:** User accounts and security
- **Firebase Cloud Messaging (FCM):** Push notifications
- **Firebase Storage:** Media file storage

### Mobile (React Native + Expo)
- **Expo Router:** Navigation between screens
- **Expo SQLite:** Local message persistence
- **Expo Notifications:** Push notification handling
- **Expo ImagePicker:** Photo selection
- **React Native:** UI components and app logic

### AI Integration (Post-MVP)
- OpenAI GPT-4 or Anthropic Claude
- AI SDK by Vercel or LangChain
- Function calling/tool use
- RAG pipeline for conversation history

---

## Tech Stack Analysis & Potential Pitfalls

### Why React Native + Expo for This Project

#### ✅ Advantages
1. **Rapid MVP Development:** Expo provides pre-built modules (SQLite, notifications, image picker) that would take hours to configure natively
2. **Cross-Platform:** Single codebase works on iOS and Android (doubles your potential user base)
3. **No Mac Required:** Can develop on Windows/Linux and use EAS Build for iOS compilation
4. **Hot Reload:** See changes instantly without rebuilding (critical for 24-hour deadline)
5. **Expo Go Testing:** Test on physical device without complicated provisioning
6. **Firebase Integration:** Excellent React Native Firebase libraries with real-time listeners
7. **Course Alignment:** Matches the alternative stack path; likely has some support

#### ⚠️ Potential Pitfalls & Mitigation

**1. Push Notifications Complexity**
- **Pitfall:** Getting background notifications working reliably in Expo can be tricky
- **Mitigation:** 
  - Start with foreground notifications (MVP requirement)
  - Use Expo's push notification service (easier than raw FCM)
  - Test on physical device early (notifications don't work well in simulator)
  - Budget 3-4 hours specifically for notification setup

**2. Real-Time Performance**
- **Pitfall:** React Native has a JavaScript bridge that can cause lag with rapid messages
- **Mitigation:**
  - Use Firestore's `onSnapshot` listeners efficiently (don't subscribe to too many)
  - Implement message pagination (load 50 at a time, not all messages)
  - Use `FlatList` with proper optimization for message rendering
  - Test with 20+ rapid-fire messages early

**3. Offline/Online State Management**
- **Pitfall:** Managing optimistic updates + local SQLite + Firestore sync is complex
- **Mitigation:**
  - Use a clear state machine: `pending → sent → delivered → read`
  - Store ALL messages locally first, then sync
  - Use Firestore's offline persistence (built-in caching)
  - Keep a "pending messages" queue that retries on reconnect

**4. SQLite + Firestore Sync**
- **Pitfall:** Keeping local database in sync with Firestore can cause duplicates/conflicts
- **Mitigation:**
  - Use Firestore document IDs as SQLite primary keys
  - Implement "upsert" logic (update if exists, insert if new)
  - Clear strategy: Firestore is source of truth, SQLite is cache
  - Handle edge case: message sent offline, app crashes, app reopens

**5. Group Chat Complexity**
- **Pitfall:** Group chat adds significant complexity (read receipts, member management)
- **Mitigation:**
  - Implement one-on-one chat first, THEN add groups
  - For MVP, skip complex features like "remove member" or "group admin"
  - Use Firestore subcollections for group messages
  - Don't overthink read receipts - simple "read by X of Y" is fine

**6. Expo Limitations**
- **Pitfall:** Some native features require "ejecting" from managed Expo (breaks fast workflow)
- **Mitigation:**
  - Stay within Expo's managed workflow for MVP
  - Everything in your MVP is supported by Expo SDK
  - If you need custom native code later, use Expo's custom dev client (not full eject)

**7. Firebase Costs**
- **Pitfall:** Firestore charges per read/write; poor architecture can be expensive
- **Mitigation:**
  - Use Firestore's free tier (50k reads/day, 20k writes/day - plenty for MVP)
  - Don't load all messages on app open (paginate)
  - Use local cache aggressively
  - Limit real-time listeners (one per active chat max)

**8. Development Environment**
- **Pitfall:** Expo projects can have dependency conflicts
- **Mitigation:**
  - Use `npx create-expo-app` with TypeScript template
  - Lock your Expo SDK version (don't auto-upgrade mid-sprint)
  - Test on both iOS and Android early (different notification behaviors)

### Recommended Development Order (Hour-by-Hour)

**Hours 1-4: Core Messaging**
- Firebase project setup + Firestore rules
- Expo project creation with Router
- Basic chat UI (message list, input field)
- Send message → Firestore → appears on sender's screen

**Hours 5-8: Real-Time & Persistence**
- Firestore real-time listeners (messages appear on recipient device)
- Expo SQLite setup
- Message persistence (save to SQLite on receive)
- Load messages from SQLite on app open

**Hours 9-12: Optimistic UI & Status**
- Optimistic updates (message appears instantly before server confirms)
- Message state indicators (sending, sent, delivered)
- Online/offline status with Firestore presence
- Typing indicators

**Hours 13-16: Groups & Auth**
- Firebase Auth with Phone Number Sign-In (SMS verification)
- User profiles with manual setup (display name, photo)
- Allow custom profile photo upload
- Group chat: Simple "add participants" flow (no group settings)
- Read receipts: Show "Read by X of Y" count

**Hours 17-20: Polish & Notifications**
- Foreground push notifications (Expo Notifications + FCM)
- Image picker with compression (expo-image-manipulator)
- Image messages display and persist
- Handle offline scenarios (airplane mode test)
- App lifecycle handling (background/foreground)

**Hours 21-24: Testing & Deployment**
- Test on 2+ physical devices
- Offline/online testing
- Rapid message testing
- Deploy to Expo Go or TestFlight
- Record demo video

---

## Out of Scope for MVP (Post-24 Hours)

### Will Build After MVP (Days 2-7)
- **AI Features for Busy Parent Persona:**
  1. Smart calendar extraction from messages
  2. Decision summarization (group chat decisions)
  3. Priority message highlighting
  4. RSVP tracking
  5. Deadline/reminder extraction
  6. Advanced: Proactive Assistant or Multi-Step Agent

### Explicitly NOT in MVP
- Message editing or deletion
- Voice messages
- Video messages
- Message reactions (emoji responses)
- Message search
- User blocking
- Group admin features (remove members, promote admin)
- End-to-end encryption
- Message forwarding
- Link previews
- Location sharing
- Contact integration
- Chat archiving
- Multiple device sync (beyond basic login)
- Desktop/web version

---

## Success Criteria for MVP Checkpoint

### Hard Requirements (Must Pass)
- [ ] Two users can send text messages back and forth in real-time
- [ ] Messages persist after closing and reopening app
- [ ] Message sent while offline is delivered when connection returns
- [ ] Optimistic UI: message appears immediately when user hits send
- [ ] Online/offline status visible for users
- [ ] Message timestamps visible
- [ ] Users can log in with Firebase Auth
- [ ] Basic group chat with 3+ users works
- [ ] Read receipts show delivered/read state
- [ ] Foreground push notifications work
- [ ] App runs on emulator/simulator with deployed backend

### Testing Strategy

#### Automated Testing
- Unit tests for message state management (sending, sent, delivered, read)
- Integration tests for Firebase Auth phone number flow
- Component tests for chat UI components
- SQLite persistence tests

#### Manual Testing Checklist
1. ✅ Send message from Device A → appears on Device B within 1 second
2. ✅ Force quit app, reopen → message history is intact
3. ✅ Turn on airplane mode on Device A, send message → Device B receives it when Device A reconnects
4. ✅ Send 20 messages rapidly → all appear in order on both devices
5. ✅ Create group with 3 users → all users receive messages
6. ✅ Background app → receive notification → tap notification → opens correct chat
7. ✅ Send image → recipient receives and can view image
8. ✅ Phone number authentication → SMS code → successful login
9. ✅ Profile setup → display name and photo upload
10. ✅ Group creation → add multiple users → user-defined group name

#### Error Logging & Monitoring
- Firebase Crashlytics for crash reporting
- Console logging for development debugging
- Error boundaries for React Native components
- Network error handling with retry logic
- Offline state logging for debugging sync issues

---

## Decisions Made

1. **Authentication Method:** ✅ Phone Number Sign-In (Firebase Auth) - Universal access, no passwords, SMS verification
2. **Profile Pictures:** ✅ Allow uploads - Use Expo ImagePicker + Firebase Storage
3. **Message Pagination:** ✅ Load last 50 messages per chat - Implement "load more" if user scrolls to top
4. **Group Chat Creation:** ✅ Simple "add participants" flow - No group settings/admin for MVP
5. **Notification Priority:** ✅ Foreground notifications only for MVP - Background is post-checkpoint
6. **Image Compression:** ✅ Yes - Use expo-image-manipulator (built-in, simple API)
7. **Read Receipts in Groups:** ✅ Show count only - "Read by 2 of 3" (not individual names)

---

## Next Steps

1. Review this PRD and provide feedback
2. Answer open questions above
3. Set up development environment (Expo + Firebase)
4. Begin Hour 1-4 implementation: Core messaging
5. Test early and often on physical devices