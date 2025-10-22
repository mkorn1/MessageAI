import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { PresenceSummaryProps } from '../types/presence';

/**
 * PresenceSummary component displays overflow indicator for groups with 5+ online participants
 * Shows format like "●+4" when there are more than 5 online users
 */
export const PresenceSummary: React.FC<PresenceSummaryProps> = ({
  count,
  dotSize = 8,
  textSize = 12,
  color = '#00C851', // Green color for online status
  testID = 'presence-summary'
}) => {
  const dotStyle = {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: color,
    // Add shadow for better visibility
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

  const textStyle = {
    fontSize: textSize,
    color: color,
    fontWeight: '500' as const,
    // Ensure text is readable on different backgrounds
    textShadowColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.3)' : undefined,
    textShadowOffset: Platform.OS === 'ios' ? { width: 0, height: 1 } : undefined,
    textShadowRadius: Platform.OS === 'ios' ? 1 : undefined,
  };

  return (
    <View 
      style={styles.container} 
      testID={testID}
      accessibilityLabel={`${count} more online participants`}
      accessibilityRole="text"
      accessibilityHint="Shows additional online participants not displayed individually"
      accessible={true}
    >
      <View style={[styles.dot, dotStyle]} />
      <Text style={[styles.text, textStyle]}>+{count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure minimum touch target for accessibility
    minHeight: 24,
    paddingHorizontal: 2,
  },
  dot: {
    marginRight: 2,
  },
  text: {
    marginLeft: 1,
    // Ensure text doesn't get cut off
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default PresenceSummary;
