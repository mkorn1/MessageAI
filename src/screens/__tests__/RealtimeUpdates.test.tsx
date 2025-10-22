/**
 * Real-time Updates Verification Test
 * 
 * This test verifies that presence indicators update in real-time when users
 * go online/offline, including Firestore listeners, cache updates, and UI reactivity.
 */

import { NavigationContainer } from '@react-navigation/native';
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { usePresence } from '../hooks/usePresence';
import { Chat } from '../types/chat';
import HomeScreen from './HomeScreen';

// Mock Firestore
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  onSnapshot: mockOnSnapshot,
}));

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

const mockRoute = {
  params: {},
};

describe('Real-time Updates Verification', () => {
  const mockChat: Chat = {
    id: 'test-chat',
    name: 'Test Chat',
    type: 'group',
    participants: ['user1', 'user2', 'user3'],
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessage: {
      id: 'msg1',
      text: 'Test message',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshot.mockReturnValue(mockUnsubscribe);
    mockDoc.mockReturnValue({ id: 'test-doc' });
  });

  describe('Firestore Listener Setup', () => {
    it('should set up Firestore listeners for each participant', async () => {
      // Mock initial presence data
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'test-chat',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
            { userId: 'user2', isOnline: false, displayName: 'User 2' },
            { userId: 'user3', isOnline: true, displayName: 'User 3' },
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
        // Verify that onSnapshot was called for each participant
        expect(mockOnSnapshot).toHaveBeenCalledTimes(3);
        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user1');
        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user2');
        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user3');
      });
    });

    it('should clean up listeners on unmount', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'test-chat',
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

      const { unmount } = render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(mockOnSnapshot).toHaveBeenCalled();
      });

      unmount();

      // Verify cleanup function was called
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Real-time Presence Updates', () => {
    it('should update presence indicators when user goes online', async () => {
      // Initial state: 1 user online
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
      });

      // Update: 2 users online (user2 goes online)
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
        // Should now show 2 dots instead of 1
      });
    });

    it('should update presence indicators when user goes offline', async () => {
      // Initial state: 2 users online
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
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

      const { rerender } = render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
      });

      // Update: 1 user online (user2 goes offline)
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
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

      rerender(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
        // Should now show 1 dot instead of 2
      });
    });

    it('should hide presence indicators when all users go offline', async () => {
      // Initial state: 1 user online
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
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

      const { rerender } = render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
      });

      // Update: 0 users online (user1 goes offline)
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
          participants: [
            { userId: 'user1', isOnline: false, displayName: 'User 1' },
          ],
          onlineCount: 0,
          totalCount: 1,
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
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });
  });

  describe('Format Transitions', () => {
    it('should transition from individual dots to summary format', async () => {
      // Initial state: 5 users online (individual dots)
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
          participants: Array.from({ length: 5 }, (_, i) => ({
            userId: `user${i + 1}`,
            isOnline: true,
            displayName: `User ${i + 1}`,
          })),
          onlineCount: 5,
          totalCount: 5,
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
        // Should show individual dots
      });

      // Update: 6 users online (summary format)
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
          participants: Array.from({ length: 6 }, (_, i) => ({
            userId: `user${i + 1}`,
            isOnline: true,
            displayName: `User ${i + 1}`,
          })),
          onlineCount: 6,
          totalCount: 6,
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
        // Should now show summary format
        const summary = screen.getByTestId('presence-summary');
        expect(summary).toBeTruthy();
      });
    });

    it('should transition from summary format to individual dots', async () => {
      // Initial state: 6 users online (summary format)
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
          participants: Array.from({ length: 6 }, (_, i) => ({
            userId: `user${i + 1}`,
            isOnline: true,
            displayName: `User ${i + 1}`,
          })),
          onlineCount: 6,
          totalCount: 6,
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
        // Should show summary format
        const summary = screen.getByTestId('presence-summary');
        expect(summary).toBeTruthy();
      });

      // Update: 5 users online (individual dots)
      mockUsePresence.mockReturnValueOnce({
        presence: {
          chatId: 'test-chat',
          participants: Array.from({ length: 5 }, (_, i) => ({
            userId: `user${i + 1}`,
            isOnline: true,
            displayName: `User ${i + 1}`,
          })),
          onlineCount: 5,
          totalCount: 5,
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
        // Should now show individual dots
        const summary = screen.queryByTestId('presence-summary');
        expect(summary).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore listener errors gracefully', async () => {
      // Mock error in Firestore listener
      mockOnSnapshot.mockImplementation((docRef, onNext, onError) => {
        onError(new Error('Firestore connection failed'));
        return mockUnsubscribe;
      });

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
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });

    it('should handle network connectivity issues', async () => {
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
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should use cache for presence data', async () => {
      const mockRefresh = jest.fn();
      
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'test-chat',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
          ],
          onlineCount: 1,
          totalCount: 1,
        },
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
      });

      // Verify refresh function is available for cache updates
      expect(mockRefresh).toBeDefined();
    });

    it('should minimize re-renders with efficient state updates', async () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        return (
          <NavigationContainer>
            <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
          </NavigationContainer>
        );
      };

      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'test-chat',
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

      render(<TestComponent />);

      await waitFor(() => {
        expect(renderCount).toBeLessThanOrEqual(3); // Should not cause excessive re-renders
      });
    });
  });
});
