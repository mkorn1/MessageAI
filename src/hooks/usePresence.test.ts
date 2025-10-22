import { act, renderHook, waitFor } from '@testing-library/react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import presenceCache from '../services/presence';
import UserService from '../services/user';
import { Chat } from '../types/chat';
import { ChatPresence } from '../types/presence';
import usePresence from '../usePresence';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

// Mock services
jest.mock('../services/user');
jest.mock('../services/presence');

// Mock Firebase database
jest.mock('../../firebase', () => ({
  db: {},
}));

const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockPresenceCache = presenceCache as jest.Mocked<typeof presenceCache>;
const mockOnSnapshot = onSnapshot as jest.MockedFunction<typeof onSnapshot>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;

describe('usePresence Hook', () => {
  const mockChat: Chat = {
    id: 'chat-1',
    name: 'Test Chat',
    type: 'group',
    participants: ['user-1', 'user-2', 'user-3'],
    createdAt: new Date(),
    updatedAt: new Date(),
    allowMemberInvites: true,
    allowMemberMessages: true,
    allowFileSharing: true,
    isArchived: false,
    isMuted: false,
    notificationSettings: {
      soundEnabled: true,
      vibrationEnabled: true,
    },
  };

  const mockUsers = [
    {
      uid: 'user-1',
      email: 'user1@test.com',
      phoneNumber: null,
      displayName: 'User One',
      photoURL: null,
      firstName: 'User',
      lastName: 'One',
      bio: null,
      status: 'online',
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isOnline: true,
      showOnlineStatus: true,
      allowMessagesFrom: 'everyone' as const,
      pushNotifications: true,
      emailNotifications: true,
      theme: 'auto' as const,
      language: 'en',
    },
    {
      uid: 'user-2',
      email: 'user2@test.com',
      phoneNumber: null,
      displayName: 'User Two',
      photoURL: null,
      firstName: 'User',
      lastName: 'Two',
      bio: null,
      status: 'offline',
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isOnline: false,
      showOnlineStatus: true,
      allowMessagesFrom: 'everyone' as const,
      pushNotifications: true,
      emailNotifications: true,
      theme: 'auto' as const,
      language: 'en',
    },
    {
      uid: 'user-3',
      email: 'user3@test.com',
      phoneNumber: null,
      displayName: 'User Three',
      photoURL: null,
      firstName: 'User',
      lastName: 'Three',
      bio: null,
      status: 'online',
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isOnline: true,
      showOnlineStatus: true,
      allowMessagesFrom: 'everyone' as const,
      pushNotifications: true,
      emailNotifications: true,
      theme: 'auto' as const,
      language: 'en',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPresenceCache.get.mockReturnValue(null);
    mockPresenceCache.set.mockImplementation(() => {});
    mockPresenceCache.extendTTL.mockImplementation(() => {});
  });

  it('should return null presence when chat is null', () => {
    const { result } = renderHook(() => usePresence(null));

    expect(result.current.presence).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return null presence when chat has no participants', () => {
    const emptyChat = { ...mockChat, participants: [] };
    const { result } = renderHook(() => usePresence(emptyChat));

    expect(result.current.presence).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should use cached data when available', async () => {
    const cachedPresence: ChatPresence = {
      chatId: 'chat-1',
      participants: [
        { userId: 'user-1', isOnline: true, displayName: 'User One' },
        { userId: 'user-2', isOnline: false, displayName: 'User Two' },
      ],
      onlineCount: 1,
      totalCount: 2,
    };

    mockPresenceCache.get.mockReturnValue(cachedPresence);

    const { result } = renderHook(() => usePresence(mockChat));

    await waitFor(() => {
      expect(result.current.presence).toEqual(cachedPresence);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPresenceCache.get).toHaveBeenCalledWith('chat-1');
    expect(mockUserService.getUsersByIds).not.toHaveBeenCalled();
  });

  it('should fetch fresh data when cache is empty', async () => {
    mockPresenceCache.get.mockReturnValue(null);
    mockUserService.getUsersByIds.mockResolvedValue({
      success: true,
      data: mockUsers,
    });

    const { result } = renderHook(() => usePresence(mockChat));

    await waitFor(() => {
      expect(result.current.presence).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockUserService.getUsersByIds).toHaveBeenCalledWith(['user-1', 'user-2', 'user-3']);
    expect(mockPresenceCache.set).toHaveBeenCalled();
  });

  it('should handle user service errors', async () => {
    mockPresenceCache.get.mockReturnValue(null);
    mockUserService.getUsersByIds.mockResolvedValue({
      success: false,
      error: { message: 'Network error' },
    });

    const { result } = renderHook(() => usePresence(mockChat));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Network error');
  });

  it('should set up real-time listeners for participants', () => {
    mockPresenceCache.get.mockReturnValue(null);
    mockUserService.getUsersByIds.mockResolvedValue({
      success: true,
      data: mockUsers,
    });

    renderHook(() => usePresence(mockChat));

    expect(mockDoc).toHaveBeenCalledTimes(3); // One for each participant
    expect(mockOnSnapshot).toHaveBeenCalledTimes(3);
  });

  it('should clean up listeners on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => usePresence(mockChat));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
  });

  it('should update presence when real-time data changes', async () => {
    let snapshotCallback: (snapshot: any) => void;
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      snapshotCallback = callback;
      return jest.fn();
    });

    mockPresenceCache.get.mockReturnValue(null);
    mockUserService.getUsersByIds.mockResolvedValue({
      success: true,
      data: mockUsers,
    });

    const { result } = renderHook(() => usePresence(mockChat));

    await waitFor(() => {
      expect(result.current.presence).toBeTruthy();
    });

    // Simulate real-time update
    const mockSnapshot = {
      exists: () => true,
      id: 'user-1',
      data: () => ({
        email: 'user1@test.com',
        displayName: 'User One',
        isOnline: false, // Changed from true to false
        lastSeen: new Date(),
      }),
    };

    act(() => {
      snapshotCallback(mockSnapshot);
    });

    await waitFor(() => {
      expect(result.current.presence?.onlineCount).toBe(1); // Should be 1 now (only user-3 online)
    });
  });

  it('should handle refresh function', async () => {
    mockPresenceCache.get.mockReturnValue(null);
    mockUserService.getUsersByIds.mockResolvedValue({
      success: true,
      data: mockUsers,
    });

    const { result } = renderHook(() => usePresence(mockChat));

    await waitFor(() => {
      expect(result.current.presence).toBeTruthy();
    });

    // Clear cache and refresh
    mockPresenceCache.get.mockReturnValue(null);
    mockUserService.getUsersByIds.mockResolvedValue({
      success: true,
      data: mockUsers,
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockUserService.getUsersByIds).toHaveBeenCalledTimes(2);
    });
  });

  it('should extend cache TTL on unmount', () => {
    const { unmount } = renderHook(() => usePresence(mockChat));

    unmount();

    expect(mockPresenceCache.extendTTL).toHaveBeenCalledWith('chat-1', 60000);
  });

  it('should handle invalid presence data gracefully', async () => {
    mockPresenceCache.get.mockReturnValue(null);
    mockUserService.getUsersByIds.mockResolvedValue({
      success: true,
      data: [], // Empty data should trigger validation error
    });

    const { result } = renderHook(() => usePresence(mockChat));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe('Invalid presence data');
  });
});
