# Active Context: Current Work Focus

## Project Status
**Phase**: Pre-Development Setup
**Timeline**: 24 hours to MVP
**Current Focus**: Memory Bank initialization and project setup

## Recent Changes
- Memory Bank system initialized
- Project documentation reviewed (PRD, feature list)
- Tech stack confirmed (React Native + Expo + Firebase)
- Development environment ready for setup

## Current Work Focus

### Immediate Next Steps
1. **Firebase Project Setup**
   - Create Firebase project
   - Configure Firestore, Auth, Storage, FCM
   - Set up Firestore security rules
   - Configure Firebase config files

2. **Expo Project Configuration**
   - Install Firebase dependencies
   - Set up environment variables
   - Configure app.json for notifications
   - Test basic Expo setup

3. **Core Messaging Foundation (Hours 1-4)**
   - Basic chat UI components
   - Firebase Firestore integration
   - Send message → appears on sender's screen
   - Real-time message sync between devices

### Active Decisions Made
- **Authentication**: Phone number sign-in with SMS verification
- **Database**: Firestore for real-time sync + SQLite for offline
- **UI Framework**: React Native with Expo Router
- **Deployment**: Expo Go for MVP testing
- **Notifications**: Foreground only for MVP

### Current Blockers
- None identified - ready to begin development

### Testing Strategy
- **Real Device Testing**: Use physical iOS/Android devices
- **Milestone Testing**: Test after each major feature completion
- **Offline Testing**: Airplane mode simulation
- **Multi-Device Testing**: Two devices for real-time sync validation

## Development Environment Status
- **Expo Project**: Created and configured
- **Dependencies**: Basic Expo dependencies installed
- **Firebase**: Not yet configured
- **Testing Devices**: Need to identify available devices

## Key Files to Create/Modify
- `firebase.js` - Firebase configuration
- `firestore.rules` - Database security rules
- `app/(tabs)/index.tsx` - Main chat interface
- `components/ChatMessage.tsx` - Message component
- `components/MessageInput.tsx` - Input component
- `hooks/useMessages.ts` - Message management hook
- `hooks/useAuth.ts` - Authentication hook

## Risk Mitigation
- **Push Notifications**: Start with foreground only (MVP requirement)
- **Real-Time Performance**: Use FlatList optimization and pagination
- **Offline Sync**: Implement clear state machine for message states
- **Group Chat**: Keep simple for MVP (no admin features)

## Success Metrics for Current Phase
- Firebase project created and configured
- Basic message sending working
- Real-time sync between two devices
- Messages persist after app restart
- Optimistic UI updates working

## Next Milestone
**Milestone 1.1: Minimum Viable Message (Hours 1-2)**
- Send text from Device A → appears on Device A's screen
- Message visible in Firebase Console
- Basic chat UI functional
