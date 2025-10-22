import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PresenceIndicatorProps } from '../types/presence';
import PresenceDot from './PresenceDot';
import PresenceSummary from './PresenceSummary';

/**
 * PresenceIndicator component handles the logic for displaying presence indicators
 * Shows individual dots for small groups (≤5 online) or summary format for larger groups
 * Only displays online participants (ignores offline users)
 */
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  onlineCount,
  maxIndividualDots = 5,
  dotSize = 8,
  spacing = 4,
  testID = 'presence-indicator'
}) => {
  // Don't render anything if no one is online
  if (onlineCount === 0) {
    return null;
  }

  // Show individual dots if count is within limit
  if (onlineCount <= maxIndividualDots) {
    return (
      <View 
        style={[styles.container, { gap: spacing }]} 
        testID={testID}
        accessibilityLabel={`${onlineCount} participants online`}
        accessibilityRole="text"
        accessibilityHint="Shows the number of participants currently online"
        accessible={true}
      >
        {Array.from({ length: onlineCount }, (_, index) => (
          <PresenceDot
            key={index}
            size={dotSize}
            testID={`presence-dot-${index}`}
          />
        ))}
      </View>
    );
  }

  // Show summary format for overflow
  const overflowCount = onlineCount - maxIndividualDots;
  return (
    <View 
      style={styles.container} 
      testID={testID}
      accessibilityLabel={`${onlineCount} participants online (${maxIndividualDots} shown)`}
      accessibilityRole="text"
      accessibilityHint="Shows total online participants with summary format for large groups"
      accessible={true}
    >
      <PresenceSummary
        count={overflowCount}
        dotSize={dotSize}
        testID="presence-summary"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Ensure minimum touch target for accessibility
    minHeight: 24,
    paddingVertical: 2,
  },
});

export default PresenceIndicator;
