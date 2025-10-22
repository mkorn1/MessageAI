import { NavigationContainer } from '@react-navigation/native';
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { usePresence } from '../hooks/usePresence';
import { Chat } from '../types/chat';
import HomeScreen from './HomeScreen';

// Mock the usePresence hook
jest.mock('../hooks/usePresence');
const mockUsePresence = usePresence as jest.MockedFunction<typeof usePresence>;

// Mock other dependencies
jest.mock('../services/chat', () => ({
  getAllChats: jest.fn(),
  createChat: jest.fn(),
  deleteChat: jest.fn(),
}));

jest.mock('../services/user', () => ({
  getAllUsers: jest.fn(),
  searchUsersByEmail: jest.fn(),
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    signOut: jest.fn(),
  }),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {},
};

describe('HomeScreen Presence Indicators', () => {
  const mockChats: Chat[] = [
    {
      id: 'chat1',
      name: 'Test Chat 1',
      type: 'group',
      participants: ['user1', 'user2', 'user3'],
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: {
        id: 'msg1',
        text: 'Hello world',
        senderId: 'user1',
        timestamp: new Date(),
        type: 'text',
      },
      allowMemberInvites: true,
      allowMemberMessages: true,
      allowFileSharing: true,
      isArchived: false,
      isMuted: false,
      notificationSettings: {
        soundEnabled: true,
        vibrationEnabled: true,
        showPreviews: true,
      },
    },
    {
      id: 'chat2',
      name: 'Test Chat 2',
      type: 'group',
      participants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'],
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: {
        id: 'msg2',
        text: 'Another message',
        senderId: 'user2',
        timestamp: new Date(),
        type: 'text',
      },
      allowMemberInvites: true,
      allowMemberMessages: true,
      allowFileSharing: true,
      isArchived: false,
      isMuted: false,
      notificationSettings: {
        soundEnabled: true,
        vibrationEnabled: true,
        showPreviews: true,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Presence Indicator Display', () => {
    it('should display presence indicators for chats with online users', async () => {
      // Mock presence data for chat1 with 2 online users
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'chat1',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
            { userId: 'user2', isOnline: true, displayName: 'User 2' },
            { userId: 'user3', isOnline: false, displayName: 'User 3' },
          ],
          onlineCount: 2,
          totalCount: 3,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        // Should show 2 individual dots for 2 online users
        const presenceIndicator = screen.getByTestId('presence-indicator-chat1');
        expect(presenceIndicator).toBeTruthy();
      });
    });

    it('should display summary format for chats with more than 5 online users', async () => {
      // Mock presence data for chat2 with 6 online users
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'chat2',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
            { userId: 'user2', isOnline: true, displayName: 'User 2' },
            { userId: 'user3', isOnline: true, displayName: 'User 3' },
            { userId: 'user4', isOnline: true, displayName: 'User 4' },
            { userId: 'user5', isOnline: true, displayName: 'User 5' },
            { userId: 'user6', isOnline: true, displayName: 'User 6' },
          ],
          onlineCount: 6,
          totalCount: 6,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        // Should show summary format (●+1) for 6 online users
        const presenceSummary = screen.getByTestId('presence-summary');
        expect(presenceSummary).toBeTruthy();
      });
    });

    it('should not display presence indicators when no users are online', async () => {
      // Mock presence data with no online users
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'chat1',
          participants: [
            { userId: 'user1', isOnline: false, displayName: 'User 1' },
            { userId: 'user2', isOnline: false, displayName: 'User 2' },
            { userId: 'user3', isOnline: false, displayName: 'User 3' },
          ],
          onlineCount: 0,
          totalCount: 3,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        // Should not show presence indicator when onlineCount is 0
        const presenceIndicator = screen.queryByTestId('presence-indicator-chat1');
        expect(presenceIndicator).toBeNull();
      });
    });

    it('should handle loading state gracefully', async () => {
      // Mock loading state
      mockUsePresence.mockReturnValue({
        presence: null,
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        // Should not show presence indicators while loading
        const presenceIndicator = screen.queryByTestId('presence-indicator-chat1');
        expect(presenceIndicator).toBeNull();
      });
    });

    it('should handle error state gracefully', async () => {
      // Mock error state
      mockUsePresence.mockReturnValue({
        presence: null,
        isLoading: false,
        error: new Error('Failed to fetch presence'),
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        // Should not show presence indicators when there's an error
        const presenceIndicator = screen.queryByTestId('presence-indicator-chat1');
        expect(presenceIndicator).toBeNull();
      });
    });
  });

  describe('Presence Indicator Positioning', () => {
    it('should position presence indicators on the right side of chat cards', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'chat1',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
            { userId: 'user2', isOnline: true, displayName: 'User 2' },
          ],
          onlineCount: 2,
          totalCount: 2,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceContainer = screen.getByTestId('presence-indicator-chat1').parent;
        expect(presenceContainer).toBeTruthy();
        
        // Check that the presence container has the correct styling
        const presenceContainerStyle = presenceContainer?.props.style;
        expect(presenceContainerStyle).toMatchObject({
          alignItems: 'center',
          justifyContent: 'center',
        });
      });
    });
  });

  describe('Presence Indicator Styling', () => {
    it('should apply correct styling to presence indicators', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'chat1',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
          ],
          onlineCount: 1,
          totalCount: 1,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-chat1');
        expect(presenceIndicator).toBeTruthy();
        
        // Check that the presence indicator has the correct props
        expect(presenceIndicator.props.dotSize).toBe(8);
        expect(presenceIndicator.props.spacing).toBe(3);
        expect(presenceIndicator.props.maxIndividualDots).toBe(5);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update presence indicators when presence data changes', async () => {
      // Initial state with 1 online user
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'chat1',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
            { userId: 'user2', isOnline: false, displayName: 'User 2' },
          ],
          onlineCount: 1,
          totalCount: 2,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { rerender } = render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-chat1');
        expect(presenceIndicator).toBeTruthy();
      });

      // Update to 2 online users
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'chat1',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
            { userId: 'user2', isOnline: true, displayName: 'User 2' },
          ],
          onlineCount: 2,
          totalCount: 2,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      rerender(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-chat1');
        expect(presenceIndicator).toBeTruthy();
        // Should now show 2 dots instead of 1
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility attributes', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'chat1',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
          ],
          onlineCount: 1,
          totalCount: 1,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-chat1');
        expect(presenceIndicator).toBeTruthy();
        
        // Check accessibility attributes
        expect(presenceIndicator.props.accessibilityLabel).toBe('1 participants online');
        expect(presenceIndicator.props.accessibilityRole).toBe('text');
        expect(presenceIndicator.props.accessibilityHint).toBe('Shows the number of participants currently online');
        expect(presenceIndicator.props.accessible).toBe(true);
      });
    });
  });
});
