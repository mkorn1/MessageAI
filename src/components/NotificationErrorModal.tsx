import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { NotificationError } from '../services/notificationErrorService';
import { IconSymbol } from './ui/icon-symbol';

interface NotificationErrorModalProps {
  visible: boolean;
  onClose: () => void;
  errors: NotificationError[];
  onClearErrors: () => void;
}

export const NotificationErrorModal: React.FC<NotificationErrorModalProps> = ({
  visible,
  onClose,
  errors,
  onClearErrors,
}) => {
  const [selectedError, setSelectedError] = useState<NotificationError | null>(null);

  const getErrorIcon = (type: NotificationError['type']) => {
    switch (type) {
      case 'PERMISSION_DENIED':
        return 'exclamationmark.triangle.fill';
      case 'TOKEN_INVALID':
        return 'key.fill';
      case 'NETWORK_ERROR':
        return 'wifi.exclamationmark';
      case 'VALIDATION_ERROR':
        return 'checkmark.circle.fill';
      default:
        return 'questionmark.circle.fill';
    }
  };

  const getErrorColor = (type: NotificationError['type']) => {
    switch (type) {
      case 'PERMISSION_DENIED':
        return '#FF9500';
      case 'TOKEN_INVALID':
        return '#FF3B30';
      case 'NETWORK_ERROR':
        return '#007AFF';
      case 'VALIDATION_ERROR':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const handleClearErrors = () => {
    Alert.alert(
      'Clear Errors',
      'Are you sure you want to clear all notification errors?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            onClearErrors();
            setSelectedError(null);
          }
        }
      ]
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      month: 'short',
      day: 'numeric',
    }).format(timestamp);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Notification Errors</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol name="xmark" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {errors.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="checkmark.circle.fill" size={48} color="#34C759" />
              <Text style={styles.emptyStateTitle}>No Errors</Text>
              <Text style={styles.emptyStateText}>
                All notifications are working properly
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.clearButton} onPress={handleClearErrors}>
                  <IconSymbol name="trash.fill" size={16} color="#FF3B30" />
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
                <Text style={styles.countText}>{errors.length} error{errors.length !== 1 ? 's' : ''}</Text>
              </View>

              <ScrollView style={styles.errorsList}>
                {errors.map((error) => (
                  <TouchableOpacity
                    key={error.id}
                    style={[
                      styles.errorItem,
                      selectedError?.id === error.id && styles.selectedErrorItem
                    ]}
                    onPress={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                  >
                    <View style={styles.errorHeader}>
                      <View style={styles.errorIconContainer}>
                        <IconSymbol
                          name={getErrorIcon(error.type)}
                          size={20}
                          color={getErrorColor(error.type)}
                        />
                      </View>
                      <View style={styles.errorInfo}>
                        <Text style={styles.errorType}>{error.type.replace('_', ' ')}</Text>
                        <Text style={styles.errorTime}>{formatTimestamp(error.timestamp)}</Text>
                      </View>
                      <View style={styles.retryInfo}>
                        <Text style={styles.retryCount}>
                          {error.retryCount}/{error.maxRetries}
                        </Text>
                      </View>
                    </View>
                    
                    {selectedError?.id === error.id && (
                      <View style={styles.errorDetails}>
                        <Text style={styles.errorMessage}>{error.message}</Text>
                        {error.context && (
                          <View style={styles.contextContainer}>
                            <Text style={styles.contextLabel}>Context:</Text>
                            <Text style={styles.contextText}>
                              {JSON.stringify(error.context, null, 2)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF2F2',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: 4,
  },
  countText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  errorsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  errorItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  selectedErrorItem: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  errorInfo: {
    flex: 1,
  },
  errorType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    textTransform: 'capitalize',
  },
  errorTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  retryInfo: {
    alignItems: 'flex-end',
  },
  retryCount: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  errorDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  errorMessage: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 8,
  },
  contextContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 6,
    padding: 8,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontFamily: 'monospace',
  },
});

export default NotificationErrorModal;
