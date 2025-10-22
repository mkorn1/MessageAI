# Tasks: Visual Presence Indicators

## Relevant Files

- `src/components/PresenceIndicator.tsx` - Main reusable component for displaying presence dots
- `src/components/PresenceIndicator.test.tsx` - Unit tests for PresenceIndicator component
- `src/components/PresenceDot.tsx` - Individual dot component for online status
- `src/components/PresenceDot.test.tsx` - Unit tests for PresenceDot component
- `src/components/PresenceSummary.tsx` - Overflow indicator component (●+4 format)
- `src/components/PresenceSummary.test.tsx` - Unit tests for PresenceSummary component
- `src/hooks/usePresence.ts` - Custom hook for managing presence data and real-time updates
- `src/hooks/usePresence.test.ts` - Unit tests for usePresence hook
- `src/services/presence.ts` - Service for presence data management and offline timeout logic
- `src/services/presence.test.ts` - Unit tests for presence service
- `src/screens/HomeScreen.tsx` - Modified to include presence indicators on chat cards
- `src/screens/ChatScreen.tsx` - Modified to include presence indicators in chat header
- `src/types/presence.ts` - Type definitions for presence-related data structures
- `src/utils/presenceUtils.ts` - Utility functions for presence calculations and formatting
- `src/utils/presenceUtils.test.ts` - Unit tests for presence utilities

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Create Presence Indicator Components
  - [x] 1.1 Create PresenceDot component with green dot styling (8-10px diameter)
  - [x] 1.2 Create PresenceSummary component for overflow display (●+4 format)
  - [x] 1.3 Create PresenceIndicator component that handles individual dots vs summary logic
  - [x] 1.4 Add proper TypeScript interfaces for presence component props
  - [x] 1.5 Implement responsive styling and accessibility features
  - [x] 1.6 Write unit tests for all presence components

- [x] 2.0 Integrate Presence Data with Existing System
  - [x] 2.1 Create usePresence custom hook for real-time presence data
  - [x] 2.2 Integrate with existing User.isOnline boolean field
  - [x] 2.3 Set up Firestore listeners for presence updates
  - [x] 2.4 Create presence data filtering logic (online users only)
  - [x] 2.5 Implement presence data caching for performance
  - [x] 2.6 Write unit tests for presence data integration

- [ ] 3.0 Add Presence Indicators to Chat Cards (HomeScreen)
  - [ ] 3.1 Modify HomeScreen to fetch presence data for each chat
  - [ ] 3.2 Add PresenceIndicator component to chat card layout
  - [ ] 3.3 Position dots on right side of chat cards
  - [ ] 3.4 Implement overflow logic (5+ online users = ●+4 format)
  - [ ] 3.5 Handle edge cases (no online users, missing data)
  - [ ] 3.6 Test presence indicators in chat list scrolling

- [ ] 4.0 Add Presence Indicators to Chat Headers (ChatScreen)
  - [ ] 4.1 Modify ChatScreen header to include presence data
  - [ ] 4.2 Add PresenceIndicator component to chat header layout
  - [ ] 4.3 Position dots after participant count, before settings button
  - [ ] 4.4 Handle single participant chats (one dot when online)
  - [ ] 4.5 Implement same overflow logic as chat cards
  - [ ] 4.6 Ensure dots don't interfere with existing header elements

- [ ] 5.0 Implement Offline Timeout Logic
  - [ ] 5.1 Create presence service for offline timeout management
  - [ ] 5.2 Implement 30-45 second timeout after app closure detection
  - [ ] 5.3 Add app lifecycle event listeners (background/foreground)
  - [ ] 5.4 Update Firestore with offline status when timeout occurs
  - [ ] 5.5 Handle rapid app open/close scenarios
  - [ ] 5.6 Write unit tests for offline timeout logic

- [ ] 6.0 Testing and Performance Optimization
  - [ ] 6.1 Test presence indicators with large chat lists (100+ chats)
  - [ ] 6.2 Verify real-time updates within 5 seconds
  - [ ] 6.3 Test presence indicators in groups with 10+ participants
  - [ ] 6.4 Performance test scrolling with presence indicators
  - [ ] 6.5 Test offline timeout functionality
  - [ ] 6.6 Verify no UI lag or stuttering during presence updates
