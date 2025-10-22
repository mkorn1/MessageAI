import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { PresenceDotProps } from '../types/presence';

/**
 * PresenceDot component displays a colored dot to indicate online status
 * Used for individual online participants in chat lists and headers
 */
export const PresenceDot: React.FC<PresenceDotProps> = ({
  size = 10, // Increased from 8 to 10 for better visibility
  color = '#00C851', // Green color for online status
  testID = 'presence-dot'
}) => {
  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    // Add shadow for better visibility on different backgrounds
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: {
        elevation: 2,
      },
    }),
  };

  return (
    <View 
      style={[styles.container, dotStyle]} 
      testID={testID}
      accessibilityLabel="Online status indicator"
      accessibilityRole="image"
      accessibilityHint="Shows this person is currently online"
      // Add minimum touch target for accessibility
      accessible={true}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    // Remove minimum touch target size that was interfering with dot visibility
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PresenceDot;
