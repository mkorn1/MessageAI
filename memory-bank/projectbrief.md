# Project Brief: MessageAI MVP

## Core Mission
Build a reliable real-time messaging app with offline support, designed as a foundation for AI-enhanced communication features.

## Target Timeline
**24 hours to MVP** - Complete core messaging functionality with all essential features working end-to-end.

## Primary User Persona
**Busy Parent/Caregiver (Sarah, 35)**
- Juggles multiple schedules (kids, partner, school, activities)
- Needs reliable messaging that works in spotty connectivity areas
- Requires offline access to important information
- Values real-time updates and delivery confirmation

## Core Value Proposition
1. **Reliability First**: Messages work even with poor connectivity
2. **Offline Access**: Full message history available without internet
3. **Real-Time Sync**: Instant message delivery across devices
4. **AI Foundation**: Built as platform for future AI-enhanced features

## Success Criteria (Must Pass)
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

## Out of Scope for MVP
- Message editing/deletion
- Voice/video messages
- Message reactions
- Message search
- User blocking
- Group admin features
- End-to-end encryption
- Background notifications (foreground only for MVP)

## Post-MVP Vision (Days 2-7)
AI-enhanced features for busy parents:
- Smart calendar extraction from messages
- Decision summarization in group chats
- Priority message highlighting
- RSVP tracking
- Deadline/reminder extraction
- Proactive assistant capabilities
