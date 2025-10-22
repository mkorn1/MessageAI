import { render, screen } from '@testing-library/react-native';
import React from 'react';
import PresenceIndicator from '../PresenceIndicator';

// Mock the child components
jest.mock('../PresenceDot', () => {
  const { View, Text } = require('react-native');
  return function MockPresenceDot({ testID, size }: { testID: string; size: number }) {
    return (
      <View testID={testID}>
        <Text>Dot-{size}</Text>
      </View>
    );
  };
});

jest.mock('../PresenceSummary', () => {
  const { View, Text } = require('react-native');
  return function MockPresenceSummary({ count, testID }: { count: number; testID: string }) {
    return (
      <View testID={testID}>
        <Text>Summary-+{count}</Text>
      </View>
    );
  };
});

describe('PresenceIndicator', () => {
  it('renders nothing when onlineCount is 0', () => {
    const { container } = render(<PresenceIndicator onlineCount={0} />);
    expect(container.children).toHaveLength(0);
  });

  it('renders individual dots when count is within limit', () => {
    render(<PresenceIndicator onlineCount={3} />);
    
    const indicator = screen.getByTestId('presence-indicator');
    expect(indicator).toBeTruthy();
    
    // Should render 3 individual dots
    expect(screen.getByTestId('presence-dot-0')).toBeTruthy();
    expect(screen.getByTestId('presence-dot-1')).toBeTruthy();
    expect(screen.getByTestId('presence-dot-2')).toBeTruthy();
  });

  it('renders individual dots when count equals maxIndividualDots', () => {
    render(<PresenceIndicator onlineCount={5} maxIndividualDots={5} />);
    
    const indicator = screen.getByTestId('presence-indicator');
    expect(indicator).toBeTruthy();
    
    // Should render 5 individual dots
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`presence-dot-${i}`)).toBeTruthy();
    }
  });

  it('renders summary when count exceeds maxIndividualDots', () => {
    render(<PresenceIndicator onlineCount={8} maxIndividualDots={5} />);
    
    const indicator = screen.getByTestId('presence-indicator');
    expect(indicator).toBeTruthy();
    
    // Should render summary with overflow count (8 - 5 = 3)
    expect(screen.getByTestId('presence-summary')).toBeTruthy();
    expect(screen.getByText('Summary-+3')).toBeTruthy();
  });

  it('uses custom maxIndividualDots', () => {
    render(<PresenceIndicator onlineCount={4} maxIndividualDots={3} />);
    
    // Should render summary since 4 > 3 (overflow count = 1)
    expect(screen.getByTestId('presence-summary')).toBeTruthy();
    expect(screen.getByText('Summary-+1')).toBeTruthy();
  });

  it('passes correct props to PresenceDot', () => {
    render(<PresenceIndicator onlineCount={2} dotSize={12} />);
    
    const dot0 = screen.getByTestId('presence-dot-0');
    const dot1 = screen.getByTestId('presence-dot-1');
    
    expect(dot0).toBeTruthy();
    expect(dot1).toBeTruthy();
  });

  it('passes correct props to PresenceSummary', () => {
    render(<PresenceIndicator onlineCount={7} maxIndividualDots={5} dotSize={10} />);
    
    const summary = screen.getByTestId('presence-summary');
    expect(summary).toBeTruthy();
    
    // Overflow count should be 7 - 5 = 2
    expect(screen.getByText('Summary-+2')).toBeTruthy();
  });

  it('has proper accessibility properties for individual dots', () => {
    render(<PresenceIndicator onlineCount={3} />);
    
    const indicator = screen.getByTestId('presence-indicator');
    expect(indicator.props.accessibilityLabel).toBe('3 participants online');
    expect(indicator.props.accessibilityRole).toBe('text');
    expect(indicator.props.accessibilityHint).toBe('Shows the number of participants currently online');
    expect(indicator.props.accessible).toBe(true);
  });

  it('has proper accessibility properties for summary', () => {
    render(<PresenceIndicator onlineCount={8} maxIndividualDots={5} />);
    
    const indicator = screen.getByTestId('presence-indicator');
    expect(indicator.props.accessibilityLabel).toBe('8 participants online (5 shown)');
    expect(indicator.props.accessibilityRole).toBe('text');
    expect(indicator.props.accessibilityHint).toBe('Shows total online participants with summary format for large groups');
    expect(indicator.props.accessible).toBe(true);
  });

  it('renders with custom testID', () => {
    render(<PresenceIndicator onlineCount={2} testID="custom-indicator" />);
    
    const indicator = screen.getByTestId('custom-indicator');
    expect(indicator).toBeTruthy();
  });

  it('handles edge cases correctly', () => {
    // Test with very large numbers
    const { rerender } = render(<PresenceIndicator onlineCount={100} maxIndividualDots={5} />);
    expect(screen.getByText('Summary-+95')).toBeTruthy();

    // Test with maxIndividualDots = 1
    rerender(<PresenceIndicator onlineCount={3} maxIndividualDots={1} />);
    expect(screen.getByText('Summary-+2')).toBeTruthy();
  });

  it('applies correct styling', () => {
    render(<PresenceIndicator onlineCount={2} spacing={8} />);
    
    const indicator = screen.getByTestId('presence-indicator');
    expect(indicator.props.style).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      minHeight: 24,
      paddingVertical: 2,
    });
  });
});
