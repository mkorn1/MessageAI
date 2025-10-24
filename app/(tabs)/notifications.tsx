import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useAuth } from '../../src/contexts/AuthContext';

const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'todos'>('notifications');

  const handleBackPress = () => {
    router.back();
  };

  const renderNotificationsContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.emptyState}>
        <IconSymbol name="bell.fill" size={48} color="#8E8E93" />
        <Text style={styles.emptyStateTitle}>No notifications yet</Text>
        <Text style={styles.emptyStateText}>
          You'll see notifications here when you receive new messages
        </Text>
      </View>
    </View>
  );

  const renderTodosContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.emptyState}>
        <IconSymbol name="list.bullet" size={48} color="#8E8E93" />
        <Text style={styles.emptyStateTitle}>No tasks yet</Text>
        <Text style={styles.emptyStateText}>
          Create your first task to get started
        </Text>
      </View>
    </View>
  );

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
          <Text style={[
            styles.tabText,
            activeTab === 'todos' && styles.activeTabText
          ]}>
            To do's
          </Text>
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
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  activeTabText: {
    color: '#FFFFFF',
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
