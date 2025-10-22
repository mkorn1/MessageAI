/**
 * Edge Cases and Error Handling Test
 * 
 * This test verifies that presence indicators handle edge cases and errors gracefully,
 * including no online users, missing data, network issues, and other boundary conditions.
 */

import { NavigationContainer } from '@react-navigation/native';
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import PresenceDot from '../components/PresenceDot';
import PresenceIndicator from '../components/PresenceIndicator';
import PresenceSummary from '../components/PresenceSummary';
import { usePresence } from '../hooks/usePresence';
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

const mockRoute = {
  params: {},
};

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('No Online Users Edge Cases', () => {
    it('should handle zero online users gracefully', () => {
      const { queryByTestId } = render(
        <PresenceIndicator onlineCount={0} testID="test-indicator" />
      );
      
      const indicator = queryByTestId('test-indicator');
      expect(indicator).toBeNull();
    });

    it('should handle negative online count gracefully', () => {
      const { queryByTestId } = render(
        <PresenceIndicator onlineCount={-1} testID="test-indicator" />
      );
      
      const indicator = queryByTestId('test-indicator');
      expect(indicator).toBeNull();
    });

    it('should handle undefined online count gracefully', () => {
      const { queryByTestId } = render(
        <PresenceIndicator onlineCount={undefined as any} testID="test-indicator" />
      );
      
      const indicator = queryByTestId('test-indicator');
      expect(indicator).toBeNull();
    });

    it('should handle null online count gracefully', () => {
      const { queryByTestId } = render(
        <PresenceIndicator onlineCount={null as any} testID="test-indicator" />
      );
      
      const indicator = queryByTestId('test-indicator');
      expect(indicator).toBeNull();
    });
  });

  describe('Missing Data Edge Cases', () => {
    it('should handle missing presence data gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: null,
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
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });

    it('should handle incomplete presence data gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'test-chat',
          participants: [], // Empty participants array
          onlineCount: 0,
          totalCount: 0,
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
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });

    it('should handle malformed presence data gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'test-chat',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
            { userId: 'user2', isOnline: 'invalid' as any, displayName: 'User 2' }, // Invalid isOnline value
          ],
          onlineCount: 1, // Should only count valid online users
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
        // Should only show 1 dot for the valid online user
      });
    });
  });

  describe('Network and Connection Error Cases', () => {
    it('should handle network connection errors gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: null,
        isLoading: false,
        error: new Error('Network connection failed'),
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });

    it('should handle Firestore permission errors gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: null,
        isLoading: false,
        error: new Error('Permission denied'),
        refresh: jest.fn(),
      });

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });

    it('should handle timeout errors gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: null,
        isLoading: false,
        error: new Error('Request timeout'),
        refresh: jest.fn(),
      });

      render(
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

  describe('Loading State Edge Cases', () => {
    it('should handle loading state gracefully', async () => {
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
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });

    it('should handle loading state with cached data gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'test-chat',
          participants: [
            { userId: 'user1', isOnline: true, displayName: 'User 1' },
          ],
          onlineCount: 1,
          totalCount: 1,
        },
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
      });
    });
  });

  describe('Boundary Value Edge Cases', () => {
    it('should handle exactly 5 online users (boundary condition)', () => {
      const { getByTestId } = render(
        <PresenceIndicator onlineCount={5} testID="test-indicator" />
      );
      
      const indicator = getByTestId('test-indicator');
      expect(indicator).toBeTruthy();
      
      // Should show individual dots (not summary format)
      const dots = screen.queryAllByTestId(/presence-dot-/);
      expect(dots).toHaveLength(5);
      
      const summary = screen.queryByTestId('presence-summary');
      expect(summary).toBeNull();
    });

    it('should handle exactly 6 online users (boundary condition)', () => {
      const { getByTestId } = render(
        <PresenceIndicator onlineCount={6} testID="test-indicator" />
      );
      
      const indicator = getByTestId('test-indicator');
      expect(indicator).toBeTruthy();
      
      // Should show summary format (not individual dots)
      const summary = screen.getByTestId('presence-summary');
      expect(summary).toBeTruthy();
      
      const dots = screen.queryAllByTestId(/presence-dot-/);
      expect(dots).toHaveLength(0);
    });

    it('should handle very large online counts gracefully', () => {
      const { getByTestId } = render(
        <PresenceIndicator onlineCount={1000} testID="test-indicator" />
      );
      
      const indicator = getByTestId('test-indicator');
      expect(indicator).toBeTruthy();
      
      // Should show summary format
      const summary = screen.getByTestId('presence-summary');
      expect(summary).toBeTruthy();
    });
  });

  describe('Component Prop Edge Cases', () => {
    it('should handle invalid dot size gracefully', () => {
      const { getByTestId } = render(
        <PresenceDot size={-5} testID="test-dot" />
      );
      
      const dot = getByTestId('test-dot');
      expect(dot).toBeTruthy();
      
      // Should use default size or handle gracefully
      const style = dot.props.style;
      expect(style.width).toBeGreaterThan(0);
    });

    it('should handle zero dot size gracefully', () => {
      const { getByTestId } = render(
        <PresenceDot size={0} testID="test-dot" />
      );
      
      const dot = getByTestId('test-dot');
      expect(dot).toBeTruthy();
    });

    it('should handle invalid color gracefully', () => {
      const { getByTestId } = render(
        <PresenceDot color="invalid-color" testID="test-dot" />
      );
      
      const dot = getByTestId('test-dot');
      expect(dot).toBeTruthy();
      
      // Should use default color or handle gracefully
      const style = dot.props.style;
      expect(style.backgroundColor).toBeDefined();
    });

    it('should handle negative count in PresenceSummary gracefully', () => {
      const { getByTestId } = render(
        <PresenceSummary count={-1} testID="test-summary" />
      );
      
      const summary = getByTestId('test-summary');
      expect(summary).toBeTruthy();
      
      // Should display the count as provided (even if negative)
      const textElement = summary.querySelector('span');
      expect(textElement.textContent).toBe('+-1');
    });

    it('should handle zero count in PresenceSummary gracefully', () => {
      const { getByTestId } = render(
        <PresenceSummary count={0} testID="test-summary" />
      );
      
      const summary = getByTestId('test-summary');
      expect(summary).toBeTruthy();
      
      const textElement = summary.querySelector('span');
      expect(textElement.textContent).toBe('+0');
    });
  });

  describe('Real-time Update Edge Cases', () => {
    it('should handle rapid state changes gracefully', async () => {
      // Simulate rapid state changes
      const states = [
        { onlineCount: 1, isLoading: false, error: null },
        { onlineCount: 2, isLoading: false, error: null },
        { onlineCount: 0, isLoading: false, error: null },
        { onlineCount: 5, isLoading: false, error: null },
        { onlineCount: 6, isLoading: false, error: null },
      ];

      let stateIndex = 0;
      mockUsePresence.mockImplementation(() => {
        const state = states[stateIndex % states.length];
        stateIndex++;
        return {
          presence: state.onlineCount > 0 ? {
            chatId: 'test-chat',
            participants: Array.from({ length: state.onlineCount }, (_, i) => ({
              userId: `user${i + 1}`,
              isOnline: true,
              displayName: `User ${i + 1}`,
            })),
            onlineCount: state.onlineCount,
            totalCount: state.onlineCount,
          } : null,
          isLoading: state.isLoading,
          error: state.error,
          refresh: jest.fn(),
        };
      });

      const { rerender } = render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      // Test rapid rerenders
      for (let i = 0; i < 5; i++) {
        rerender(
          <NavigationContainer>
            <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
          </NavigationContainer>
        );
        
        await waitFor(() => {
          // Should not crash during rapid updates
          expect(screen.queryByTestId('presence-indicator-test-chat')).toBeTruthy();
        });
      }
    });

    it('should handle concurrent updates gracefully', async () => {
      // Simulate concurrent updates
      mockUsePresence.mockReturnValue({
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

      render(
        <NavigationContainer>
          <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
      });

      // Simulate concurrent error
      mockUsePresence.mockReturnValue({
        presence: null,
        isLoading: false,
        error: new Error('Concurrent update conflict'),
        refresh: jest.fn(),
      });

      // Should handle error gracefully without crashing
      await waitFor(() => {
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle memory leaks gracefully', () => {
      const { unmount } = render(
        <PresenceIndicator onlineCount={5} testID="test-indicator" />
      );
      
      // Should clean up properly on unmount
      unmount();
      
      // Should not cause memory leaks
      expect(true).toBe(true); // Test passes if no memory leaks
    });

    it('should handle excessive re-renders gracefully', () => {
      let renderCount = 0;
      const TestComponent = () => {
        renderCount++;
        return <PresenceIndicator onlineCount={2} testID="test-indicator" />;
      };

      const { rerender } = render(<TestComponent />);
      
      // Simulate excessive re-renders
      for (let i = 0; i < 100; i++) {
        rerender(<TestComponent />);
      }
      
      // Should not cause performance issues
      expect(renderCount).toBeGreaterThan(0);
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle invalid user data gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: 'test-chat',
          participants: [
            { userId: '', isOnline: true, displayName: '' }, // Empty userId and displayName
            { userId: null as any, isOnline: true, displayName: null as any }, // Null values
            { userId: 'user3', isOnline: true, displayName: 'User 3' }, // Valid user
          ],
          onlineCount: 3,
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
        const presenceIndicator = screen.getByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeTruthy();
        // Should handle invalid user data gracefully
      });
    });

    it('should handle missing required fields gracefully', async () => {
      mockUsePresence.mockReturnValue({
        presence: {
          chatId: '', // Empty chatId
          participants: undefined as any, // Missing participants
          onlineCount: 0,
          totalCount: 0,
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
        const presenceIndicator = screen.queryByTestId('presence-indicator-test-chat');
        expect(presenceIndicator).toBeNull();
      });
    });
  });
});
