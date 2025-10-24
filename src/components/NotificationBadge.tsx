import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  size?: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  size = 20 
}) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={[styles.badge, { width: size, height: size }]}>
      <Text style={[styles.badgeText, { fontSize: size * 0.6 }]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    minHeight: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NotificationBadge;
