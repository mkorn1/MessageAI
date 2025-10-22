import { render, screen } from '@testing-library/react-native';
import React from 'react';
import PresenceSummary from '../PresenceSummary';

describe('PresenceSummary', () => {
  it('renders with required count prop', () => {
    render(<PresenceSummary count={4} />);
    
    const summary = screen.getByTestId('presence-summary');
    expect(summary).toBeTruthy();
  });

  it('displays correct count text', () => {
    render(<PresenceSummary count={4} />);
    
    const countText = screen.getByText('+4');
    expect(countText).toBeTruthy();
  });

  it('renders with custom dot size', () => {
    render(<PresenceSummary count={3} dotSize={12} />);
    
    const summary = screen.getByTestId('presence-summary');
    expect(summary).toBeTruthy();
  });

  it('renders with custom text size', () => {
    render(<PresenceSummary count={5} textSize={14} />);
    
    const countText = screen.getByText('+5');
    expect(countText).toBeTruthy();
  });

  it('renders with custom color', () => {
    render(<PresenceSummary count={2} color="#FF0000" />);
    
    const summary = screen.getByTestId('presence-summary');
    expect(summary).toBeTruthy();
  });

  it('renders with custom testID', () => {
    render(<PresenceSummary count={1} testID="custom-summary" />);
    
    const summary = screen.getByTestId('custom-summary');
    expect(summary).toBeTruthy();
  });

  it('has proper accessibility properties', () => {
    render(<PresenceSummary count={3} />);
    
    const summary = screen.getByTestId('presence-summary');
    expect(summary.props.accessibilityLabel).toBe('3 more online participants');
    expect(summary.props.accessibilityRole).toBe('text');
    expect(summary.props.accessibilityHint).toBe('Shows additional online participants not displayed individually');
    expect(summary.props.accessible).toBe(true);
  });

  it('displays correct count for different values', () => {
    const { rerender } = render(<PresenceSummary count={1} />);
    expect(screen.getByText('+1')).toBeTruthy();

    rerender(<PresenceSummary count={10} />);
    expect(screen.getByText('+10')).toBeTruthy();

    rerender(<PresenceSummary count={99} />);
    expect(screen.getByText('+99')).toBeTruthy();
  });

  it('applies correct styling for dot and text', () => {
    render(<PresenceSummary count={4} dotSize={10} textSize={14} color="#00FF00" />);
    
    const summary = screen.getByTestId('presence-summary');
    const countText = screen.getByText('+4');
    
    expect(summary).toBeTruthy();
    expect(countText).toBeTruthy();
  });

  it('has minimum touch target size for accessibility', () => {
    render(<PresenceSummary count={2} />);
    
    const summary = screen.getByTestId('presence-summary');
    expect(summary.props.style.minHeight).toBe(24);
  });

  it('handles zero count gracefully', () => {
    render(<PresenceSummary count={0} />);
    
    const countText = screen.getByText('+0');
    expect(countText).toBeTruthy();
  });
});
