# Technical Context: MessageAI Tech Stack

## Technology Stack

### Frontend: React Native + Expo
- **Framework**: React Native 0.81.4 with Expo SDK 54
- **Navigation**: Expo Router for file-based routing
- **UI**: React Native components with custom styling
- **State**: React Context + local state management

### Backend: Firebase Suite
- **Database**: Firestore for real-time message sync
- **Authentication**: Firebase Auth with phone number sign-in
- **Storage**: Firebase Storage for media files
- **Functions**: Firebase Cloud Functions (post-MVP for AI)
- **Notifications**: Firebase Cloud Messaging (FCM)

### Local Storage: Expo SQLite
- **Database**: SQLite for offline message persistence
- **Sync**: Local cache that syncs with Firestore
- **Offline**: Full message history available without internet

### Development Environment
- **Platform**: Cross-platform (iOS + Android)
- **Testing**: Expo Go for device testing
- **Deployment**: Expo Go (MVP) → TestFlight/APK (post-MVP)

## Key Dependencies

### Core Expo Modules
```json
{
  "expo-router": "~6.0.13",           // File-based navigation
  "expo-sqlite": "~15.0.0",           // Local database
  "expo-notifications": "~0.30.0",    // Push notifications
  "expo-image-picker": "~16.0.0",     // Photo selection
  "expo-image-manipulator": "~12.0.0" // Image compression
}
```

### Firebase Integration
```json
{
  "@react-native-firebase/app": "^20.0.0",
  "@react-native-firebase/firestore": "^20.0.0",
  "@react-native-firebase/auth": "^20.0.0",
  "@react-native-firebase/storage": "^20.0.0",
  "@react-native-firebase/messaging": "^20.0.0"
}
```

### React Native Libraries
```json
{
  "react-native-gesture-handler": "~2.28.0",
  "react-native-reanimated": "~4.1.1",
  "react-native-safe-area-context": "~5.6.0",
  "react-native-screens": "~4.16.0"
}
```

## Development Setup

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project with Firestore, Auth, Storage enabled
- Physical iOS/Android device for testing (notifications don't work in simulator)

### Project Structure
```
app/
├── _layout.tsx              # Root layout
├── (tabs)/                  # Tab navigation
│   ├── _layout.tsx
│   ├── index.tsx           # Chat list
│   └── explore.tsx         # Settings/profile
└── modal.tsx               # Modal screens

components/
├── ui/                     # Reusable UI components
└── [feature-components]    # Feature-specific components

hooks/                      # Custom React hooks
constants/                   # App constants and themes
```

## Technical Constraints

### Expo Limitations
- **Managed Workflow**: Must stay within Expo's managed workflow for MVP
- **Native Modules**: Limited to Expo-compatible modules
- **Background Tasks**: Limited background processing capabilities
- **Custom Native Code**: Requires ejecting (not recommended for MVP)

### Firebase Constraints
- **Free Tier Limits**: 50k reads/day, 20k writes/day (sufficient for MVP)
- **Real-Time Listeners**: Cost scales with active listeners
- **Storage Costs**: Image storage and bandwidth costs
- **Function Limits**: Cold start delays for Cloud Functions

### React Native Constraints
- **JavaScript Bridge**: Potential performance bottleneck for rapid updates
- **Memory Management**: Large message histories need pagination
- **Platform Differences**: iOS/Android behavior variations
- **Hot Reload**: Can mask real-world performance issues

## Performance Considerations

### Message Rendering
- **FlatList**: Use for message lists with proper optimization
- **Pagination**: Load 50 messages at a time
- **Image Compression**: Resize images to 1024px width max
- **Memory**: Clear old messages from memory, keep in SQLite

### Real-Time Performance
- **Listener Management**: One listener per active chat
- **Debouncing**: Typing indicators with 3-second timeout
- **Batching**: Group rapid message updates
- **Connection State**: Handle network changes gracefully

### Offline Performance
- **SQLite Indexing**: Index on message timestamps and chat IDs
- **Sync Strategy**: Incremental sync, not full refresh
- **Queue Management**: Limit offline message queue size
- **Storage Cleanup**: Remove old messages periodically

## Security Considerations

### Authentication
- **Phone Verification**: SMS-based authentication only
- **Session Management**: Firebase handles session persistence
- **Profile Privacy**: Users control their display information

### Data Security
- **Firestore Rules**: Server-side access control
- **Storage Rules**: User-based file access
- **No API Keys**: All Firebase config server-side
- **Message Privacy**: Only participants access group messages

### Privacy
- **No Message Encryption**: Not required for MVP
- **Profile Data**: Minimal required information
- **Analytics**: Firebase Analytics for usage insights
- **Crash Reporting**: Firebase Crashlytics for debugging

## Deployment Strategy

### MVP Deployment
1. **Expo Go**: Primary testing platform
2. **Firebase Backend**: Deployed and configured
3. **Device Testing**: Physical iOS/Android devices
4. **Demo Video**: Recorded functionality demonstration

### Post-MVP Deployment
1. **TestFlight**: iOS beta distribution
2. **APK**: Android beta distribution
3. **App Store**: Production release
4. **CI/CD**: Automated build and deployment

## Development Workflow

### Hour-by-Hour Schedule
- **Hours 1-4**: Core messaging (Firebase + basic UI)
- **Hours 5-8**: Real-time sync + persistence (SQLite)
- **Hours 9-12**: Authentication + presence
- **Hours 13-16**: Message states + groups
- **Hours 17-20**: Media + polish
- **Hours 21-24**: Notifications + deployment

### Testing Strategy
- **Unit Tests**: Message state management
- **Integration Tests**: Firebase Auth flow
- **Component Tests**: Chat UI components
- **Manual Tests**: Real device testing checklist
- **Performance Tests**: Rapid message sending
