import { useCallback, useEffect, useState } from 'react';
import appStateService, { AppStateType } from '../services/appStateService';

interface AppStateInfo {
  currentState: AppStateType;
  previousState: AppStateType | null;
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
  stateChangeTime: Date;
  timeInCurrentState: number;
}

interface UseAppStateReturn {
  appState: AppStateInfo;
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
  getTimeInCurrentState: () => number;
}

export const useAppState = (): UseAppStateReturn => {
  const [appState, setAppState] = useState<AppStateInfo>(() => appStateService.getAppStateInfo());

  // Handle app state changes
  const handleAppStateChange = useCallback((stateInfo: AppStateInfo) => {
    console.log('🔔 useAppState: App state changed:', stateInfo);
    setAppState(stateInfo);
  }, []);

  // Set up listener
  useEffect(() => {
    appStateService.addListener(handleAppStateChange);
    
    // Get initial state
    setAppState(appStateService.getAppStateInfo());
    
    return () => {
      appStateService.removeListener(handleAppStateChange);
    };
  }, [handleAppStateChange]);

  // Get time in current state
  const getTimeInCurrentState = useCallback((): number => {
    return appStateService.getTimeInCurrentState();
  }, []);

  return {
    appState,
    isActive: appState.isActive,
    isBackground: appState.isBackground,
    isInactive: appState.isInactive,
    getTimeInCurrentState,
  };
};

export default useAppState;
