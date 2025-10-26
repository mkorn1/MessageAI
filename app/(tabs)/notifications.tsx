import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import AISuggestionList from '../../src/components/AISuggestionList';
import NotificationList from '../../src/components/NotificationList';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAISuggestions } from '../../src/hooks/useAISuggestions';
import { AISuggestionStatus } from '../../src/types/aiSuggestion';

const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'todos'>('notifications');

  // AI Suggestions hook for the To-do's tab
  const {
    suggestions,
    loading: suggestionsLoading,
    refreshing: suggestionsRefreshing,
    error: suggestionsError,
    refresh: refreshSuggestions,
    updateSuggestion,
    deleteSuggestion,
    getPendingSuggestionsCount,
  } = useAISuggestions({
    status: AISuggestionStatus.PENDING,
    enableRealtime: true,
    onSuggestionUpdate: (suggestion) => {
      console.log('🔄 Suggestion updated:', suggestion.id);
    },
    onSuggestionCreate: (suggestion) => {
      console.log('➕ New suggestion created:', suggestion.id);
    },
    onSuggestionDelete: (suggestionId) => {
      console.log('🗑️ Suggestion deleted:', suggestionId);
    },
    onError: (error) => {
      console.error('❌ AI Suggestions error:', error);
    },
  });

  // Get pending suggestions count for badge
  const pendingCount = getPendingSuggestionsCount();

  const handleBackPress = () => {
    router.back();
  };

  const renderNotificationsContent = () => (
    <NotificationList 
      onNotificationPress={(notification) => {
        console.log('🔔 Notification pressed:', notification.id);
        // Additional handling can be added here if needed
      }}
    />
  );

  const handleSuggestionAction = async (suggestionId: string, action: 'confirm' | 'reject') => {
    console.log(`🎯 Suggestion ${action}:`, suggestionId);
    
    try {
      if (action === 'reject') {
        // Delete the suggestion entirely
        const deleteResult = await deleteSuggestion(suggestionId);
        if (!deleteResult.success) {
          throw new Error(deleteResult.error?.message || 'Failed to delete suggestion');
        }
        console.log('🗑️ Suggestion deleted successfully');
      } else {
        // Update suggestion status to confirmed
        const updateResult = await updateSuggestion(suggestionId, {
          status: AISuggestionStatus.CONFIRMED,
          confirmedAt: new Date(),
        });

        if (!updateResult.success) {
          throw new Error(updateResult.error?.message || 'Failed to confirm suggestion');
        }

        console.log('✅ Suggestion accepted - functionality will be added later');
      }

    } catch (error: any) {
      console.error(`❌ Failed to ${action} suggestion:`, error.message);
      Alert.alert(
        'Error',
        error.message || `Failed to ${action} suggestion`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleNavigateToChat = (chatId: string) => {
    console.log('🧭 Navigating to chat:', chatId);
    router.push(`/chat?chatId=${chatId}` as any);
  };

  const renderTodosContent = () => {
    if (!user?.uid) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.emptyState}>
            <IconSymbol name="person.circle" size={48} color="#8E8E93" />
            <Text style={styles.emptyStateTitle}>Please sign in</Text>
            <Text style={styles.emptyStateText}>
              You need to be signed in to view AI suggestions
            </Text>
          </View>
        </View>
      );
    }

    return (
      <AISuggestionList
        userId={user.uid}
        onSuggestionAction={handleSuggestionAction}
        showSourceContext={true}
        enableFiltering={true}
        enableSorting={true}
        enablePullToRefresh={true}
        maxSuggestions={50}
        onNavigateToChat={handleNavigateToChat}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <IconSymbol name="arrow.left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'notifications' && styles.activeTab
          ]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'notifications' && styles.activeTabText
          ]}>
            Notifications
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'todos' && styles.activeTab
          ]}
          onPress={() => setActiveTab('todos')}
        >
          <View style={styles.tabContent}>
            <Text style={[
              styles.tabText,
              activeTab === 'todos' && styles.activeTabText
            ]}>
              To do's
            </Text>
            {pendingCount > 0 && (
              <View style={[
                styles.badge,
                activeTab === 'todos' && styles.badgeActive
              ]}>
                <Text style={[
                  styles.badgeText,
                  activeTab === 'todos' && styles.badgeTextActive
                ]}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'notifications' ? renderNotificationsContent() : renderTodosContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerRight: {
    width: 40, // Same width as back button for centering
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  badgeTextActive: {
    color: '#007AFF',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default NotificationsScreen;
