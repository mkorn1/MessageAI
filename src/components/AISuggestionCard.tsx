import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useTheme } from '../../hooks/useTheme';
import { AISuggestion, AISuggestionStatus, AISuggestionType } from '../types/aiSuggestion';

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onConfirm: (suggestionId: string) => Promise<void>;
  onReject: (suggestionId: string) => Promise<void>;
  onExpand?: (suggestionId: string) => void;
  isExpanded?: boolean;
  showSourceContext?: boolean;
  chatName?: string;
  messagePreview?: string;
  onNavigateToChat?: (chatId: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  suggestion,
  onConfirm,
  onReject,
  onExpand,
  isExpanded = false,
  showSourceContext = true,
  chatName,
  messagePreview,
  onNavigateToChat,
}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState<'confirm' | 'reject' | null>(null);
  const [expandAnimation] = useState(new Animated.Value(0));

  // Animate expansion
  React.useEffect(() => {
    Animated.timing(expandAnimation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, expandAnimation]);

  const getSuggestionIcon = (type: AISuggestionType): string => {
    switch (type) {
      case AISuggestionType.CalendarEvent:
        return 'calendar';
      case AISuggestionType.DecisionSummary:
        return 'checkmark.circle';
      case AISuggestionType.PriorityFlag:
        return 'exclamationmark.triangle';
      case AISuggestionType.RSVPTracking:
        return 'person.2';
      case AISuggestionType.DeadlineReminder:
        return 'clock';
      case AISuggestionType.SuggestedResponse:
        return 'bubble.left';
      default:
        return 'lightbulb';
    }
  };

  const getSuggestionColor = (type: AISuggestionType): string => {
    switch (type) {
      case AISuggestionType.CalendarEvent:
        return '#007AFF'; // Blue
      case AISuggestionType.DecisionSummary:
        return '#34C759'; // Green
      case AISuggestionType.PriorityFlag:
        return '#FF9500'; // Orange
      case AISuggestionType.RSVPTracking:
        return '#AF52DE'; // Purple
      case AISuggestionType.DeadlineReminder:
        return '#FF3B30'; // Red
      case AISuggestionType.SuggestedResponse:
        return '#5856D6'; // Indigo
      default:
        return '#8E8E93'; // Gray
    }
  };

  const getPriorityColor = (priorityLevel?: number): string => {
    if (!priorityLevel) return '#8E8E93';
    if (priorityLevel >= 5) return '#FF3B30'; // Critical - Red
    if (priorityLevel >= 4) return '#FF9500'; // High - Orange
    if (priorityLevel >= 3) return '#FFCC00'; // Medium - Yellow
    if (priorityLevel >= 2) return '#34C759'; // Low - Green
    return '#8E8E93'; // Very Low - Gray
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return '#8E8E93';
    if (confidence >= 0.8) return '#34C759'; // High - Green
    if (confidence >= 0.6) return '#FFCC00'; // Medium - Yellow
    return '#FF9500'; // Low - Orange
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleConfirm = async () => {
    try {
      setIsLoading('confirm');
      await onConfirm(suggestion.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm suggestion. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleReject = async () => {
    try {
      setIsLoading('reject');
      await onReject(suggestion.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to reject suggestion. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleExpand = () => {
    if (onExpand) {
      onExpand(suggestion.id);
    }
  };

  const renderMetadata = () => {
    if (!isExpanded) return null;

    const { metadata } = suggestion;
    const metadataItems: { label: string; value: string | number | null }[] = [];

    switch (suggestion.type) {
      case AISuggestionType.CalendarEvent:
        if (metadata.eventDate) metadataItems.push({ label: 'Date', value: metadata.eventDate });
        if (metadata.eventTime) metadataItems.push({ label: 'Time', value: metadata.eventTime });
        if (metadata.eventLocation) metadataItems.push({ label: 'Location', value: metadata.eventLocation });
        if (metadata.eventDuration) metadataItems.push({ label: 'Duration', value: `${metadata.eventDuration} min` });
        break;
      case AISuggestionType.DecisionSummary:
        if (metadata.decisionOptions?.length) {
          metadataItems.push({ label: 'Options', value: metadata.decisionOptions.join(', ') });
        }
        if (metadata.stakeholders?.length) {
          metadataItems.push({ label: 'Stakeholders', value: metadata.stakeholders.join(', ') });
        }
        break;
      case AISuggestionType.PriorityFlag:
        if (metadata.priorityLevel) {
          metadataItems.push({ label: 'Priority', value: `Level ${metadata.priorityLevel}` });
        }
        break;
      case AISuggestionType.RSVPTracking:
        if (metadata.pendingResponses?.length) {
          metadataItems.push({ label: 'Pending', value: metadata.pendingResponses.join(', ') });
        }
        if (metadata.rsvpDeadline) {
          metadataItems.push({ label: 'RSVP Deadline', value: metadata.rsvpDeadline });
        }
        break;
      case AISuggestionType.DeadlineReminder:
        if (metadata.deadline) {
          metadataItems.push({ label: 'Deadline', value: metadata.deadline });
        }
        break;
      case AISuggestionType.SuggestedResponse:
        if (metadata.responseTone) {
          metadataItems.push({ label: 'Tone', value: metadata.responseTone });
        }
        break;
    }

    if (metadata.confidence) {
      metadataItems.push({ label: 'Confidence', value: `${Math.round(metadata.confidence * 100)}%` });
    }

    if (metadataItems.length === 0) return null;

    return (
      <Animated.View
        style={[
          styles.metadataContainer,
          {
            opacity: expandAnimation,
            maxHeight: expandAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 200],
            }),
          },
        ]}
      >
        {metadataItems.map((item, index) => (
          <View key={index} style={styles.metadataItem}>
            <Text style={[styles.metadataLabel, { color: theme.text }]}>{item.label}:</Text>
            <Text style={[styles.metadataValue, { color: theme.text }]}>{item.value}</Text>
          </View>
        ))}
      </Animated.View>
    );
  };

  const renderSourceContext = () => {
    if (!showSourceContext || !chatName) return null;

    return (
      <TouchableOpacity 
        style={styles.sourceContext}
        onPress={() => onNavigateToChat?.(suggestion.chatId)}
        disabled={!onNavigateToChat}
      >
        <IconSymbol name="bubble.left" size={12} color="#8E8E93" />
        <Text style={styles.sourceText} numberOfLines={1}>
          {chatName}
          {messagePreview && ` • ${messagePreview}`}
        </Text>
        {onNavigateToChat && (
          <IconSymbol name="chevron.right" size={10} color="#8E8E93" />
        )}
      </TouchableOpacity>
    );
  };

  const renderActionButtons = () => {
    if (suggestion.status !== AISuggestionStatus.PENDING) {
      return (
        <View style={styles.statusContainer}>
          <IconSymbol
            name={suggestion.status === AISuggestionStatus.CONFIRMED ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
            size={20}
            color={suggestion.status === AISuggestionStatus.CONFIRMED ? '#34C759' : '#FF3B30'}
          />
          <Text style={[styles.statusText, { color: theme.text }]}>
            {suggestion.status === AISuggestionStatus.CONFIRMED ? 'Confirmed' : 'Rejected'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleReject}
          disabled={isLoading !== null}
        >
          {isLoading === 'reject' ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <IconSymbol name="xmark" size={16} color="#FF3B30" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton]}
          onPress={handleConfirm}
          disabled={isLoading !== null}
        >
          {isLoading === 'confirm' ? (
            <ActivityIndicator size="small" color="#34C759" />
          ) : (
            <IconSymbol name="checkmark" size={16} color="#34C759" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <IconSymbol
            name={getSuggestionIcon(suggestion.type)}
            size={24}
            color={getSuggestionColor(suggestion.type)}
          />
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {suggestion.title}
            </Text>
            {suggestion.metadata?.priorityLevel && (
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(suggestion.metadata.priorityLevel) }]} />
            )}
          </View>
          
          <Text style={[styles.description, { color: theme.text }]} numberOfLines={isExpanded ? undefined : 2}>
            {suggestion.description}
          </Text>
          
          {renderSourceContext()}
          
          <View style={styles.footer}>
            <Text style={[styles.timestamp, { color: theme.text }]}>
              {formatDate(suggestion.createdAt)}
            </Text>
            {suggestion.metadata?.confidence && (
              <View style={styles.confidenceContainer}>
                <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(suggestion.metadata.confidence) }]} />
                <Text style={[styles.confidenceText, { color: theme.text }]}>
                  {Math.round(suggestion.metadata.confidence * 100)}%
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {renderActionButtons()}
      </View>

      {/* Expandable Content */}
      {onExpand && (
        <TouchableOpacity style={styles.expandButton} onPress={handleExpand}>
          <IconSymbol
            name={isExpanded ? 'chevron.up' : 'chevron.down'}
            size={16}
            color="#8E8E93"
          />
        </TouchableOpacity>
      )}

      {renderMetadata()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
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
  contentContainer: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  sourceContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButton: {
    backgroundColor: '#E8F5E8',
  },
  rejectButton: {
    backgroundColor: '#FFE8E8',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  expandButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  metadataContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '500',
    width: 80,
    color: '#8E8E93',
  },
  metadataValue: {
    fontSize: 12,
    flex: 1,
  },
});

export default AISuggestionCard;
