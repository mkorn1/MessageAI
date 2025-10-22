import React from 'react';
import { StyleSheet, View } from 'react-native';
import PresenceDot from '../components/PresenceDot';
import PresenceIndicator from '../components/PresenceIndicator';

/**
 * Simple test component to verify presence indicators work
 * This can be temporarily added to HomeScreen for testing
 */
export const PresenceTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <PresenceDot size={12} color="#00C851" />
      <PresenceDot size={10} color="#FF0000" />
      <PresenceDot size={8} color="#0000FF" />
      
      <PresenceIndicator onlineCount={2} dotSize={10} spacing={4} />
      <PresenceIndicator onlineCount={5} dotSize={8} spacing={3} />
      <PresenceIndicator onlineCount={0} dotSize={10} spacing={4} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    backgroundColor: '#F0F0F0',
  },
});

export default PresenceTest;
