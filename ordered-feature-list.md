# MessageAI - Ordered Feature Implementation List

## Build Strategy: Vertical Slices
**Rule:** Complete each feature 100% before moving to the next. Test thoroughly on real hardware at each milestone.

---

## Phase 1: Core Messaging Foundation (Hours 1-8)
**Goal:** Get basic text messaging working end-to-end with persistence

### Milestone 1.1: Minimum Viable Message (Hours 1-2)
**Test:** Send text from Device A → appears on Device B

**STOP & TEST:** 
- Send message from Device A
- Does it appear on Device A's screen?
- Can you see it in Firebase Console?

---

### Milestone 1.2: Real-Time Sync (Hours 3-4)
**Test:** Message sent from Device A appears instantly on Device B

**STOP & TEST:**
- Open app on Device A and Device B
- Send message from Device A
- Does it appear on Device B within 1 second?
- Send from Device B → appears on Device A?

---

### Milestone 1.3: Local Persistence (Hours 5-6)
**Test:** Messages survive app restart (offline access)

**STOP & TEST:**
- Send 5 messages between devices
- Force quit app on Device A
- Reopen app on Device A
- Do all 5 messages still appear?
- Turn off WiFi on Device A → messages still visible?

---

### Milestone 1.4: Optimistic UI Updates (Hours 7-8)
**Test:** Message appears instantly on sender's screen, then confirms delivery

**STOP & TEST:**
- Send message → appears immediately with clock icon
- After ~1 second → clock changes to checkmark
- Turn on airplane mode → send message → stays as "sending"
- Turn off airplane mode → message sends automatically

---

## Phase 2: Presence & Authentication (Hours 9-12)
**Goal:** Add user accounts, online status, and typing indicators

### Milestone 2.1: User Authentication (Hours 9-10)
**Test:** Users can sign in with phone number and see their profile

**STOP & TEST:**
- Sign in with phone number and SMS verification
- Does user document appear in Firestore `users` collection?
- Sign out and back in → still logged in?
- Upload custom profile photo → updates in Firestore?

---

### Milestone 2.2: Online/Offline Presence (Hours 11)
**Test:** See when other user is online/offline

**STOP & TEST:**
- Open chat on Device A and Device B
- Device B shows green dot for Device A
- Close app on Device A
- Device B shows "last seen just now" after ~5 seconds

---

### Milestone 2.3: Typing Indicators (Hours 12)
**Test:** See when other user is typing

**STOP & TEST:**
- Type in chat on Device A
- Device B shows "User is typing..." within 1 second
- Stop typing → indicator disappears after 3 seconds
- Send message → indicator disappears immediately

---

## Phase 3: Message States & Receipts (Hours 13-14)
**Goal:** Complete message delivery tracking (sent, delivered, read)

### Milestone 3.1: Delivery Receipts (Hour 13)
**Test:** Message shows "delivered" when recipient's device receives it

**STOP & TEST:**
- Send message from Device A
- Single checkmark appears immediately
- Device B receives message
- Double checkmarks appear on Device A within 1 second

---

### Milestone 3.2: Read Receipts (Hour 14)
**Test:** Message shows "read" when recipient opens chat

**STOP & TEST:**
- Send message from Device A
- Message stays as "delivered" (gray checkmarks)
- Open chat on Device B
- Blue checkmarks appear on Device A

---

## Phase 4: Group Chat (Hours 15-17)
**Goal:** Support 3+ users in one conversation

### Milestone 4.1: Group Chat Foundation (Hour 15-16)
**Test:** Create group with 3 users, send message, all receive it

**STOP & TEST:**
- Create group with 3 users
- Send message from User A
- Users B and C both receive it in real-time
- Each message shows sender's name and photo

---

### Milestone 4.2: Group Read Receipts (Hour 17)
**Test:** Group messages show "Read by 2 of 3"

**STOP & TEST:**
- Send message in group from User A
- Shows "Read by 0 of 3"
- User B opens chat → "Read by 1 of 3"
- User C opens chat → "Read by 2 of 3"

---

## Phase 5: Media & Polish (Hours 18-21)
**Goal:** Add image sharing and app lifecycle handling

### Milestone 5.1: Image Messages (Hours 18-19)
**Test:** Send photo, appears on recipient's device

**STOP & TEST:**
- Select photo on Device A
- Photo compresses and uploads
- Thumbnail appears in chat
- Device B receives image message
- Tap image → opens full screen

---

### Milestone 5.2: Offline Queue & Reconnection (Hour 20)
**Test:** Messages sent offline are delivered when connection returns

**STOP & TEST:**
- Turn on airplane mode
- Send 3 messages on Device A
- All show "sending" status
- Turn off airplane mode
- All 3 messages send automatically and show checkmarks

---

### Milestone 5.3: App Lifecycle Handling (Hour 21)
**Test:** App handles background/foreground transitions gracefully

**STOP & TEST:**
- Send message from Device A
- Immediately background app on Device A
- Device B receives message
- Foreground app on Device A → no duplicates

---

## Phase 6: Notifications & Deployment (Hours 22-24)
**Goal:** Push notifications and final MVP deployment

### Milestone 6.1: Foreground Push Notifications (Hours 22-23)
**Test:** Receive notification when message arrives while app is open

**STOP & TEST:**
- Open app on Device A (not in chat screen)
- Send message from Device B
- Notification banner appears on Device A
- Tap notification → opens chat

---

### Milestone 6.2: Testing & Bug Fixes (Hour 23)
**Test:** Run through all MVP requirements on real devices

---

### Milestone 6.3: Deployment (Hour 24)
**Test:** App is accessible to testers/evaluators

---

## Post-MVP: AI Features (Days 2-7)
**Only start after ALL MVP features are complete and tested**

### Week 1 AI Sprint Order (After MVP)

#### Day 2: AI Foundation
- [ ] Set up Cloud Functions for AI API calls (keep API keys secure)
- [ ] Implement RAG pipeline: Retrieve conversation history from Firestore
- [ ] Basic AI chat interface or contextual menu
- [ ] Test simple prompt: "Summarize this conversation"

#### Day 3: Calendar Extraction
- [ ] Prompt engineering: Extract dates/times from messages
- [ ] Function calling: Create calendar events
- [ ] Test edge cases: Various date formats, timezones

#### Day 4: Decision Summarization
- [ ] Identify decision-making patterns in group chats
- [ ] Generate summaries: "Group decided on X"
- [ ] Highlight consensus vs. open questions

#### Day 5: Priority Highlighting & RSVP Tracking
- [ ] Detect urgent keywords ("ASAP", "urgent", deadlines)
- [ ] Track RSVP responses in group chats
- [ ] Visual indicators for priority messages

#### Day 6: Deadline/Reminder Extraction
- [ ] Extract action items with due dates
- [ ] Generate reminders
- [ ] Integrate with native calendar/reminders

#### Day 7: Advanced AI (Choose One)
- [ ] **Option A:** Proactive Assistant (detect conflicts, suggest solutions)
- [ ] **Option B:** Multi-Step Agent (plan activities based on preferences)

---

## Critical Rules Throughout:

1. ✅ **Test after every milestone** - Don't move forward if current feature is broken
2. ✅ **Use real hardware** - Simulators lie about network/lifecycle behavior
3. ✅ **Commit often** - Commit after each working milestone
4. ✅ **One feature at a time** - No parallel development of multiple features
5. ✅ **Document blockers** - If stuck >30 min, document and move to next testable slice

---

## MVP Pass Criteria:
- [ ] All Phase 1-6 milestones complete
- [ ] All 11 MVP requirements from project doc tested and working
- [ ] App deployed (Expo Go minimum)
- [ ] Demo video recorded
- [ ] No critical bugs in core messaging flow