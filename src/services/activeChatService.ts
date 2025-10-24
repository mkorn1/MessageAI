interface ActiveChatState {
  activeChatId: string | null;
  isInChat: boolean;
}

class ActiveChatService {
  private state: ActiveChatState = {
    activeChatId: null,
    isInChat: false,
  };
  
  private listeners: Set<(state: ActiveChatState) => void> = new Set();

  /**
   * Update the active chat state
   */
  updateActiveChat(activeChatId: string | null): void {
    const newState: ActiveChatState = {
      activeChatId,
      isInChat: activeChatId !== null,
    };

    const hasChanged = 
      this.state.activeChatId !== newState.activeChatId ||
      this.state.isInChat !== newState.isInChat;

    if (hasChanged) {
      console.log('🔔 ActiveChatService: Active chat changed:', {
        from: this.state.activeChatId,
        to: newState.activeChatId,
      });

      this.state = newState;
      this.notifyListeners();
    }
  }

  /**
   * Get current active chat state
   */
  getActiveChatState(): ActiveChatState {
    return { ...this.state };
  }

  /**
   * Check if user is in a specific chat
   */
  isInSpecificChat(chatId: string): boolean {
    return this.state.activeChatId === chatId;
  }

  /**
   * Check if user is in any chat
   */
  isInChat(): boolean {
    return this.state.isInChat;
  }

  /**
   * Get current active chat ID
   */
  getActiveChatId(): string | null {
    return this.state.activeChatId;
  }

  /**
   * Add listener for active chat changes
   */
  addListener(listener: (state: ActiveChatState) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener for active chat changes
   */
  removeListener(listener: (state: ActiveChatState) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('🔔 ActiveChatService: Error in listener:', error);
      }
    });
  }

  /**
   * Clear all listeners (for cleanup)
   */
  clearListeners(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const activeChatService = new ActiveChatService();
export default activeChatService;
