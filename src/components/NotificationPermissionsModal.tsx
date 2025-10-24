import React, { useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import notificationService from '../services/notificationService';

interface NotificationPermissionsModalProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
}

const NotificationPermissionsModal: React.FC<NotificationPermissionsModalProps> = ({
  visible,
  onClose,
  onPermissionGranted,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermissions = async () => {
    try {
      setIsRequesting(true);
      
      const enabled = await notificationService.areNotificationsEnabled();
      
      if (enabled) {
        console.log('🔔 Permissions already granted');
        onPermissionGranted();
        onClose();
        return;
      }

      // Request permissions
      const { status } = await notificationService.requestPermissions();
      
      if (status === 'granted') {
        console.log('🔔 Permissions granted via modal');
        onPermissionGranted();
        onClose();
      } else {
        console.log('🔔 Permissions denied via modal');
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in your device settings.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('🔔 Error requesting permissions:', error);
      Alert.alert(
        'Error',
        'Failed to request notification permissions. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Notifications',
      'You can enable notifications later in your device settings if you change your mind.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: onClose }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <IconSymbol name="bell.fill" size={48} color="#007AFF" />
            </View>
            <Text style={styles.title}>Stay Connected</Text>
            <Text style={styles.subtitle}>
              Get notified when you receive new messages
            </Text>
          </View>

          <View style={styles.features}>
            <View style={styles.feature}>
              <IconSymbol name="bell.fill" size={20} color="#34C759" />
              <Text style={styles.featureText}>Instant message notifications</Text>
            </View>
            <View style={styles.feature}>
              <IconSymbol name="arrow.left" size={20} color="#34C759" />
              <Text style={styles.featureText}>Tap to open conversations</Text>
            </View>
            <View style={styles.feature}>
              <IconSymbol name="list.bullet" size={20} color="#34C759" />
              <Text style={styles.featureText}>Never miss important messages</Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isRequesting}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.enableButton, isRequesting && styles.enableButtonDisabled]}
              onPress={handleRequestPermissions}
              disabled={isRequesting}
            >
              <Text style={styles.enableButtonText}>
                {isRequesting ? 'Requesting...' : 'Enable Notifications'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  enableButton: {
    flex: 2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  enableButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NotificationPermissionsModal;
