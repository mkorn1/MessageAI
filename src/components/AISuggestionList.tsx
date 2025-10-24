import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useTheme } from '../../hooks/useTheme';
import aiSuggestionService from '../services/aiSuggestionService';
import { AISuggestion, AISuggestionStatus, AISuggestionType } from '../types/aiSuggestion';
import AISuggestionCard from './AISuggestionCard';

interface AISuggestionListProps {
  userId: string;
  onSuggestionAction?: (suggestionId: string, action: 'confirm' | 'reject') => void;
  showSourceContext?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  enablePullToRefresh?: boolean;
  maxSuggestions?: number;
  onNavigateToChat?: (chatId: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'priority' | 'type';
type FilterOption = 'all' | AISuggestionType;

export const AISuggestionList: React.FC<AISuggestionListProps> = ({
  userId,
  onSuggestionAction,
  showSourceContext = true,
  enableFiltering = true,
  enableSorting = true,
  enablePullToRefresh = true,
  maxSuggestions = 50,
  onNavigateToChat,
}) => {
  const theme = useTheme();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadSuggestions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const result = await aiSuggestionService.getSuggestions(userId, {
        status: AISuggestionStatus.Pending,
        limit: maxSuggestions,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      if (result.success && result.data) {
        setSuggestions(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to load suggestions');
      }
    } catch (err: any) {
      console.error('Error loading suggestions:', err);
      setError(err.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, maxSuggestions]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleConfirm = async (suggestionId: string) => {
    try {
      const result = await aiSuggestionService.updateSuggestion(suggestionId, {
        status: AISuggestionStatus.Confirmed,
        confirmedAt: new Date(),
      });

      if (result.success) {
        // Remove from list or update status
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        onSuggestionAction?.(suggestionId, 'confirm');
      } else {
        throw new Error(result.error?.message || 'Failed to confirm suggestion');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to confirm suggestion');
    }
  };

  const handleReject = async (suggestionId: string) => {
    try {
      const result = await aiSuggestionService.updateSuggestion(suggestionId, {
        status: AISuggestionStatus.Rejected,
        rejectedAt: new Date(),
      });

      if (result.success) {
        // Remove from list or update status
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        onSuggestionAction?.(suggestionId, 'reject');
      } else {
        throw new Error(result.error?.message || 'Failed to reject suggestion');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject suggestion');
    }
  };

  const handleExpand = (suggestionId: string) => {
    setExpandedSuggestionId(prev => prev === suggestionId ? null : suggestionId);
  };

  const handleRefresh = () => {
    loadSuggestions(true);
  };

  const getFilteredSuggestions = (): AISuggestion[] => {
    let filtered = suggestions;

    // Apply filter
    if (filterOption !== 'all') {
      filtered = filtered.filter(s => s.type === filterOption);
    }

    // Apply sorting
    switch (sortOption) {
      case 'newest':
        filtered = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        filtered = [...filtered].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'priority':
        filtered = [...filtered].sort((a, b) => {
          const aPriority = a.metadata?.priorityLevel || 0;
          const bPriority = b.metadata?.priorityLevel || 0;
          return bPriority - aPriority;
        });
        break;
      case 'type':
        filtered = [...filtered].sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    return filtered;
  };

  const getSuggestionTypeLabel = (type: AISuggestionType): string => {
    switch (type) {
      case AISuggestionType.CalendarEvent:
        return 'Calendar';
      case AISuggestionType.DecisionSummary:
        return 'Decision';
      case AISuggestionType.PriorityFlag:
        return 'Priority';
      case AISuggestionType.RSVPTracking:
        return 'RSVP';
      case AISuggestionType.DeadlineReminder:
        return 'Deadline';
      case AISuggestionType.SuggestedResponse:
        return 'Response';
      default:
        return 'Other';
    }
  };

  const renderFilterBar = () => {
    if (!enableFiltering && !enableSorting) return null;

    return (
      <View style={[styles.filterBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <IconSymbol name="line.3.horizontal.decrease" size={16} color={theme.text} />
          <Text style={[styles.filterButtonText, { color: theme.text }]}>
            {showFilters ? 'Hide Filters' : 'Filters'}
          </Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filterOptions}>
            {/* Sort Options */}
            {enableSorting && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Sort by:</Text>
                <View style={styles.filterButtons}>
                  {(['newest', 'oldest', 'priority', 'type'] as SortOption[]).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOptionButton,
                        sortOption === option && styles.filterOptionButtonActive,
                        { backgroundColor: sortOption === option ? '#007AFF' : '#F2F2F7' }
                      ]}
                      onPress={() => setSortOption(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: sortOption === option ? '#FFFFFF' : theme.text }
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Filter Options */}
            {enableFiltering && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Filter by type:</Text>
                <View style={styles.filterButtons}>
                  <TouchableOpacity
                    style={[
                      styles.filterOptionButton,
                      filterOption === 'all' && styles.filterOptionButtonActive,
                      { backgroundColor: filterOption === 'all' ? '#007AFF' : '#F2F2F7' }
                    ]}
                    onPress={() => setFilterOption('all')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: filterOption === 'all' ? '#FFFFFF' : theme.text }
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {Object.values(AISuggestionType).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOptionButton,
                        filterOption === type && styles.filterOptionButtonActive,
                        { backgroundColor: filterOption === type ? '#007AFF' : '#F2F2F7' }
                      ]}
                      onPress={() => setFilterOption(type)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: filterOption === type ? '#FFFFFF' : theme.text }
                      ]}>
                        {getSuggestionTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="lightbulb" size={48} color="#8E8E93" />
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
        No AI suggestions yet
      </Text>
      <Text style={[styles.emptyStateText, { color: theme.text }]}>
        AI suggestions will appear here when you send messages that can be enhanced with actions like calendar events, decisions, or reminders.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <IconSymbol name="arrow.clockwise" size={16} color="#007AFF" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <IconSymbol name="exclamationmark.triangle" size={48} color="#FF3B30" />
      <Text style={[styles.errorTitle, { color: theme.text }]}>
        Failed to load suggestions
      </Text>
      <Text style={[styles.errorText, { color: theme.text }]}>
        {error}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadSuggestions()}>
        <IconSymbol name="arrow.clockwise" size={16} color="#007AFF" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuggestionCard = ({ item }: { item: AISuggestion }) => (
    <AISuggestionCard
      suggestion={item}
      onConfirm={handleConfirm}
      onReject={handleReject}
      onExpand={handleExpand}
      isExpanded={expandedSuggestionId === item.id}
      showSourceContext={showSourceContext}
      chatName={`Chat ${item.chatId.slice(-4)}`} // Simplified for now
      messagePreview={item.description.substring(0, 50) + '...'}
      onNavigateToChat={onNavigateToChat}
    />
  );

  const filteredSuggestions = getFilteredSuggestions();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading suggestions...</Text>
      </View>
    );
  }

  if (error) {
    return renderErrorState();
  }

  return (
    <View style={styles.container}>
      {renderFilterBar()}
      
      <FlatList
        data={filteredSuggestions}
        renderItem={renderSuggestionCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          enablePullToRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          ) : undefined
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredSuggestions.length === 0 ? styles.emptyListContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  filterOptions: {
    marginTop: 12,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterOptionButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  refreshButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  retryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
});

export default AISuggestionList;
