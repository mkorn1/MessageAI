# PRD: Visual Presence Indicators

## Introduction/Overview

This feature enhances the existing presence system by adding visual indicators (colored dots) to show the online/offline status of chat participants. The presence data is already tracked in the system, but currently lacks visual representation in the user interface. This feature will display colored dots on chat cards and chat headers to provide immediate visual feedback about participant availability.

**Problem Solved**: Users currently cannot quickly see who is online or offline in their chats, making it difficult to know when to expect immediate responses or when someone might be unavailable.

**Goal**: Provide clear, immediate visual feedback about participant presence status through colored dot indicators.

## Goals

1. **Visual Clarity**: Display participant presence status through intuitive colored dots
2. **Space Efficiency**: Handle large groups gracefully with overflow indicators
3. **Real-Time Updates**: Show presence changes within 5 seconds of status updates
4. **Consistent Experience**: Apply presence indicators across chat list and chat screens
5. **Performance**: Maintain smooth UI performance with presence updates

## User Stories

### Primary User Stories
- **As a busy parent**, I want to see green dots next to online participants so that I know who is available for immediate communication
- **As a group chat participant**, I want to see red dots for offline members so that I understand why some people aren't responding quickly
- **As a user in large groups**, I want to see a summary indicator (e.g., "5+") when there are many participants so that the interface doesn't become cluttered

### Secondary User Stories
- **As a user**, I want presence indicators to update in real-time so that I always have accurate information
- **As a mobile user**, I want presence indicators to be clearly visible but not overwhelming so that I can focus on the conversation

## Functional Requirements

### 1. Chat Card Presence Indicators
1.1. Display colored dots on the right side of each chat card in the home screen
1.2. Show green dots for online participants only (ignore offline participants)
1.3. For groups with 5 or fewer online participants, show individual green dots for each online participant
1.4. For groups with more than 5 online participants, show "●+4" format (dot + number)
1.5. Update presence indicators within 5 seconds of status changes
1.6. Handle edge case where no participants are online (show no dots)

### 2. Chat Header Presence Indicators
2.1. Display colored dots at the top of the chat screen header
2.2. Use same color scheme as chat cards (green for online only)
2.3. Apply same overflow logic (individual dots for ≤5 online, summary for >5 online)
2.4. Position dots to the right of the chat name/participant count
2.5. Ensure dots don't interfere with existing header elements (back button, settings)
2.6. For single participant chats, show one green dot when online, no dots when offline

### 3. Presence Data Integration
3.1. Integrate with existing `User.isOnline` boolean field
3.2. Use existing `UserStatus` enum for status determination
3.3. Leverage existing presence update mechanisms
3.4. Handle cases where presence data is unavailable (show neutral state)
3.5. Implement offline timeout: mark users as offline 30-45 seconds after app closure

### 4. Visual Design Requirements
4.1. Use consistent dot size across all locations (8-10px diameter)
4.2. Use green color (#00C851) for online status only
4.3. Ensure sufficient contrast against background colors
4.4. Maintain visual hierarchy (don't overpower other UI elements)
4.5. Arrange dots in rows: green dots in one row, red dots in another row (no overflow between rows)
4.6. Use "●+4" format for overflow (dot + number)

### 5. Performance Requirements
5.1. Presence updates must not cause UI lag or stuttering
5.2. Presence indicators should render efficiently in lists with many chats
5.3. Real-time updates should not impact message sending/receiving performance
5.4. Handle rapid presence changes gracefully (debounce if necessary)

## Non-Goals (Out of Scope)

- **Manual Status Setting**: Users cannot manually set their online/offline status
- **Last Seen Timestamps**: No "last seen 5 minutes ago" functionality
- **Status Messages**: No custom status messages or "away" indicators
- **Privacy Controls**: No ability to hide presence from specific users
- **Advanced Status Types**: Only online/offline (no "away", "busy", "invisible")
- **Presence History**: No tracking of when users were last online
- **Push Notifications**: No notifications based on presence changes
- **Desktop/Web Version**: Mobile app only for this implementation
- **Offline Indicators**: No visual indicators for offline participants (only show online)

## Design Considerations

### Visual Layout
- **Chat Cards**: Position dots on the right side, aligned with chat content
- **Chat Headers**: Position dots after participant count, before settings button
- **Spacing**: Maintain 4-6px spacing between dots
- **Alignment**: Center-align dots vertically with text content
- **Row Layout**: Green dots in top row, red dots in bottom row (no overflow between rows)

### Responsive Design
- **Small Screens**: Ensure dots remain visible on smaller devices
- **Large Groups**: Overflow indicator should be clear and readable
- **Dark Mode**: Ensure dot colors work in both light and dark themes

### Accessibility
- **Color Blindness**: Consider alternative indicators for color-blind users
- **Screen Readers**: Add appropriate accessibility labels for presence status
- **Touch Targets**: Ensure dots don't interfere with touch interactions

## Technical Considerations

### Integration Points
- **Existing Presence System**: Leverage current `User.isOnline` and `UserStatus` implementation
- **Real-Time Updates**: Use existing Firestore listeners for presence updates
- **Component Architecture**: Extend existing `HomeScreen` and `ChatScreen` components

### Data Flow
```
User Presence Change → Firestore Update → Real-Time Listener → UI Component Update → Visual Dot Update
```

### Performance Optimizations
- **Memoization**: Use React.memo for presence indicator components
- **Efficient Rendering**: Only re-render dots when presence status changes
- **List Optimization**: Use FlatList optimization for chat lists with presence indicators

### Error Handling
- **Missing Data**: Show neutral state when presence data unavailable
- **Network Issues**: Cache last known presence status
- **Rapid Updates**: Debounce rapid presence changes to prevent UI flicker

## Success Metrics

### Primary Metrics
- **Visual Clarity**: Users can immediately identify online vs offline participants
- **Real-Time Accuracy**: Presence indicators update within 5 seconds of status changes
- **UI Performance**: No noticeable lag when scrolling through chat lists with presence indicators

### Secondary Metrics
- **User Engagement**: Increased message response rates due to better availability awareness
- **User Satisfaction**: Reduced "are you there?" follow-up messages
- **System Performance**: No degradation in message sending/receiving performance

### Testing Criteria
- **Functional Testing**: Presence dots appear correctly for online/offline users
- **Overflow Testing**: Groups with 6+ participants show summary format
- **Real-Time Testing**: Presence changes reflect in UI within 5 seconds
- **Performance Testing**: Smooth scrolling with presence indicators in large chat lists
- **Edge Case Testing**: Handles missing presence data gracefully

## Open Questions

1. **Color Accessibility**: Should we provide alternative indicators (shapes, patterns) for color-blind users?
2. **Animation**: Should presence changes include subtle animations (fade in/out)?
3. **Group Size Threshold**: Is 5 participants the right threshold for switching to summary format?
4. **Offline Timeout**: Should we use 30 seconds or 45 seconds for offline detection after app closure?
5. **Performance**: Should we implement presence caching to reduce Firestore reads?
6. **Future Enhancement**: Should the design accommodate future status types (away, busy) without major changes?

## Implementation Notes

### Component Structure
- Create `PresenceIndicator` component for reusable dot display
- Create `PresenceDot` component for individual status dots
- Create `PresenceSummary` component for overflow display
- Integrate into existing `HomeScreen` and `ChatScreen` components

### Styling Approach
- Use StyleSheet for consistent dot styling
- Define color constants for online/offline states
- Ensure responsive sizing for different screen densities

### Testing Strategy
- Unit tests for presence indicator components
- Integration tests for real-time presence updates
- Visual regression tests for dot positioning and colors
- Performance tests for large chat lists with presence indicators
