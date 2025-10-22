import { render, screen } from '@testing-library/react-native';
import React from 'react';
import PresenceDot from '../PresenceDot';

describe('PresenceDot', () => {
  it('renders with default props', () => {
    render(<PresenceDot />);
    
    const dot = screen.getByTestId('presence-dot');
    expect(dot).toBeTruthy();
  });

  it('renders with custom size', () => {
    render(<PresenceDot size={12} />);
    
    const dot = screen.getByTestId('presence-dot');
    expect(dot).toBeTruthy();
  });

  it('renders with custom color', () => {
    render(<PresenceDot color="#FF0000" />);
    
    const dot = screen.getByTestId('presence-dot');
    expect(dot).toBeTruthy();
  });

  it('renders with custom testID', () => {
    render(<PresenceDot testID="custom-dot" />);
    
    const dot = screen.getByTestId('custom-dot');
    expect(dot).toBeTruthy();
  });

  it('has proper accessibility properties', () => {
    render(<PresenceDot />);
    
    const dot = screen.getByTestId('presence-dot');
    expect(dot.props.accessibilityLabel).toBe('Online status indicator');
    expect(dot.props.accessibilityRole).toBe('image');
    expect(dot.props.accessibilityHint).toBe('Shows this person is currently online');
    expect(dot.props.accessible).toBe(true);
  });

  it('applies correct styling for different sizes', () => {
    const { rerender } = render(<PresenceDot size={8} />);
    let dot = screen.getByTestId('presence-dot');
    expect(dot.props.style).toMatchObject({
      width: 8,
      height: 8,
      borderRadius: 4,
    });

    rerender(<PresenceDot size={12} />);
    dot = screen.getByTestId('presence-dot');
    expect(dot.props.style).toMatchObject({
      width: 12,
      height: 12,
      borderRadius: 6,
    });
  });

  it('applies correct color styling', () => {
    render(<PresenceDot color="#FF0000" />);
    
    const dot = screen.getByTestId('presence-dot');
    expect(dot.props.style.backgroundColor).toBe('#FF0000');
  });

  it('has minimum touch target size for accessibility', () => {
    render(<PresenceDot size={4} />);
    
    const dot = screen.getByTestId('presence-dot');
    expect(dot.props.style.minWidth).toBe(24);
    expect(dot.props.style.minHeight).toBe(24);
  });
});
