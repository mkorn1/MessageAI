import { AppState, AppStateStatus } from 'react-native';

export type AppStateType = 'active' | 'background' | 'inactive';

interface AppStateInfo {
  currentState: AppStateType;
  previousState: AppStateType | null;
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
  stateChangeTime: Date;
  timeInCurrentState: number; // milliseconds
}

class AppStateService {
  private currentState: AppStateType = 'active';
  private previousState: AppStateType | null = null;
  private stateChangeTime: Date = new Date();
  private listeners: Set<(stateInfo: AppStateInfo) => void> = new Set();
  private appStateSubscription: any = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize app state tracking
   */
  private initialize(): void {
    console.log('🔔 AppStateService: Initializing app state tracking');
    
    // Get initial state
    this.currentState = AppState.currentState as AppStateType;
    this.stateChangeTime = new Date();
    
    // Set up listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    console.log('🔔 AppStateService: Initial state:', this.currentState);
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const newState = nextAppState as AppStateType;
    
    if (newState !== this.currentState) {
      console.log('🔔 AppStateService: App state changed:', {
        from: this.currentState,
        to: newState,
        timestamp: new Date().toISOString()
      });

      this.previousState = this.currentState;
      this.currentState = newState;
      this.stateChangeTime = new Date();
      
      this.notifyListeners();
    }
  }

  /**
   * Get current app state information
   */
  getAppStateInfo(): AppStateInfo {
    const now = new Date();
    const timeInCurrentState = now.getTime() - this.stateChangeTime.getTime();

    return {
      currentState: this.currentState,
      previousState: this.previousState,
      isActive: this.currentState === 'active',
      isBackground: this.currentState === 'background',
      isInactive: this.currentState === 'inactive',
      stateChangeTime: this.stateChangeTime,
      timeInCurrentState,
    };
  }

  /**
   * Check if app is currently active
   */
  isActive(): boolean {
    return this.currentState === 'active';
  }

  /**
   * Check if app is currently in background
   */
  isBackground(): boolean {
    return this.currentState === 'background';
  }

  /**
   * Check if app is currently inactive
   */
  isInactive(): boolean {
    return this.currentState === 'inactive';
  }

  /**
   * Get current state
   */
  getCurrentState(): AppStateType {
    return this.currentState;
  }

  /**
   * Get previous state
   */
  getPreviousState(): AppStateType | null {
    return this.previousState;
  }

  /**
   * Get time spent in current state
   */
  getTimeInCurrentState(): number {
    const now = new Date();
    return now.getTime() - this.stateChangeTime.getTime();
  }

  /**
   * Add listener for app state changes
   */
  addListener(listener: (stateInfo: AppStateInfo) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener for app state changes
   */
  removeListener(listener: (stateInfo: AppStateInfo) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const stateInfo = this.getAppStateInfo();
    
    this.listeners.forEach(listener => {
      try {
        listener(stateInfo);
      } catch (error) {
        console.error('🔔 AppStateService: Error in listener:', error);
      }
    });
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    console.log('🔔 AppStateService: Cleaning up');
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.listeners.clear();
  }
}

// Export singleton instance
export const appStateService = new AppStateService();
export default appStateService;
