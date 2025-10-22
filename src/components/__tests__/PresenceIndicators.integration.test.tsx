/**
 * Integration Test for Presence Indicators
 * 
 * This test verifies that the presence indicators integrate correctly
 * with the HomeScreen component and display the expected behavior.
 */

import { render } from '@testing-library/react-native';
import React from 'react';
import PresenceDot from '../src/components/PresenceDot';
import PresenceIndicator from '../src/components/PresenceIndicator';
import PresenceSummary from '../src/components/PresenceSummary';

// Mock React Native components for testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    View: ({ children, style, testID, ...props }) => (
      <div data-testid={testID} style={style} {...props}>
        {children}
      </div>
    ),
    Text: ({ children, style, testID, ...props }) => (
      <span data-testid={testID} style={style} {...props}>
        {children}
      </span>
    ),
  };
});

describe('Presence Indicators Integration Tests', () => {
  describe('PresenceDot Component', () => {
    it('should render a green dot with correct styling', () => {
      const { getByTestId } = render(
        <PresenceDot size={8} color="#00C851" testID="test-dot" />
      );
      
      const dot = getByTestId('test-dot');
      expect(dot).toBeTruthy();
      expect(dot.props.style.backgroundColor).toBe('#00C851');
    });

    it('should have proper accessibility attributes', () => {
      const { getByTestId } = render(
        <PresenceDot testID="test-dot" />
      );
      
      const dot = getByTestId('test-dot');
      expect(dot.props.accessibilityLabel).toBe('Online status indicator');
      expect(dot.props.accessibilityRole).toBe('image');
      expect(dot.props.accessible).toBe(true);
    });
  });

  describe('PresenceSummary Component', () => {
    it('should render summary format with correct count', () => {
      const { getByTestId } = render(
        <PresenceSummary count={3} testID="test-summary" />
      );
      
      const summary = getByTestId('test-summary');
      expect(summary).toBeTruthy();
      
      // Check that the text contains the count
      const textElement = summary.querySelector('span');
      expect(textElement.textContent).toBe('+3');
    });

    it('should have proper accessibility attributes', () => {
      const { getByTestId } = render(
        <PresenceSummary count={2} testID="test-summary" />
      );
      
      const summary = getByTestId('test-summary');
      expect(summary.props.accessibilityLabel).toBe('2 more online participants');
      expect(summary.props.accessibilityRole).toBe('text');
      expect(summary.props.accessible).toBe(true);
    });
  });

  describe('PresenceIndicator Component', () => {
    it('should render individual dots for small groups', () => {
      const { getByTestId } = render(
        <PresenceIndicator onlineCount={3} testID="test-indicator" />
      );
      
      const indicator = getByTestId('test-indicator');
      expect(indicator).toBeTruthy();
      
      // Should have 3 individual dots
      const dots = indicator.querySelectorAll('[data-testid^="presence-dot-"]');
      expect(dots).toHaveLength(3);
    });

    it('should render summary format for large groups', () => {
      const { getByTestId } = render(
        <PresenceIndicator onlineCount={7} testID="test-indicator" />
      );
      
      const indicator = getByTestId('test-indicator');
      expect(indicator).toBeTruthy();
      
      // Should have summary component
      const summary = indicator.querySelector('[data-testid="presence-summary"]');
      expect(summary).toBeTruthy();
    });

    it('should not render anything when no users are online', () => {
      const { queryByTestId } = render(
        <PresenceIndicator onlineCount={0} testID="test-indicator" />
      );
      
      const indicator = queryByTestId('test-indicator');
      expect(indicator).toBeNull();
    });

    it('should have proper accessibility attributes', () => {
      const { getByTestId } = render(
        <PresenceIndicator onlineCount={2} testID="test-indicator" />
      );
      
      const indicator = getByTestId('test-indicator');
      expect(indicator.props.accessibilityLabel).toBe('2 participants online');
      expect(indicator.props.accessibilityRole).toBe('text');
      expect(indicator.props.accessible).toBe(true);
    });
  });

  describe('Presence Logic Integration', () => {
    it('should handle edge cases correctly', () => {
      // Test exactly 5 users (should show individual dots)
      const { getByTestId: getByTestId5 } = render(
        <PresenceIndicator onlineCount={5} testID="test-5" />
      );
      
      const indicator5 = getByTestId5('test-5');
      expect(indicator5).toBeTruthy();
      
      // Test 6 users (should show summary)
      const { getByTestId: getByTestId6 } = render(
        <PresenceIndicator onlineCount={6} testID="test-6" />
      );
      
      const indicator6 = getByTestId6('test-6');
      expect(indicator6).toBeTruthy();
      
      const summary = indicator6.querySelector('[data-testid="presence-summary"]');
      expect(summary).toBeTruthy();
    });

    it('should use correct default props', () => {
      const { getByTestId } = render(
        <PresenceIndicator onlineCount={2} testID="test-defaults" />
      );
      
      const indicator = getByTestId('test-defaults');
      expect(indicator).toBeTruthy();
      
      // Check that default props are applied
      const dots = indicator.querySelectorAll('[data-testid^="presence-dot-"]');
      expect(dots).toHaveLength(2);
    });
  });
});

// Export test utilities for use in other test files
export const testUtils = {
  createMockPresenceData: (onlineCount, totalCount) => ({
    chatId: 'test-chat',
    participants: Array.from({ length: totalCount }, (_, i) => ({
      userId: `user${i + 1}`,
      isOnline: i < onlineCount,
      displayName: `User ${i + 1}`,
    })),
    onlineCount,
    totalCount,
  }),
  
  createMockChat: (id, participantCount) => ({
    id,
    name: `Test Chat ${id}`,
    type: 'group',
    participants: Array.from({ length: participantCount }, (_, i) => `user${i + 1}`),
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
  }),
};
