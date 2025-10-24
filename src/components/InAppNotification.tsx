import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../components/ui/icon-symbol';
import { NotificationPayload } from '../utils/notificationUtils';

interface InAppNotificationProps {
  notification: NotificationPayload;
  visible: boolean;
  onPress: () => void;
  onDismiss: () => void;
  duration?: number; // Auto-dismiss duration in ms
}

const { width: screenWidth } = Dimensions.get('window');

export const InAppNotification: React.FC<InAppNotificationProps> = ({
  notification,
  visible,
  onPress,
  onDismiss,
  duration = 4000,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Show notification
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after duration
      dismissTimeout.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      handleDismiss();
    }

    return () => {
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }
    };
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current);
    }
    onPress();
    handleDismiss();
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notification}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol
              name={notification.data.chatType === 'group' ? 'person.2.fill' : 'person.fill'}
              size={24}
              color="#007AFF"
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {notification.body}
            </Text>
            {notification.data.chatType === 'group' && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {notification.data.chatName}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol name="xmark" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  notification: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InAppNotification;
