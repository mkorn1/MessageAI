import React, { createContext, ReactNode, useContext } from 'react';
import { useAppState } from '../hooks/useAppState';
import { AppStateType } from '../services/appStateService';

interface AppStateInfo {
  currentState: AppStateType;
  previousState: AppStateType | null;
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
  stateChangeTime: Date;
  timeInCurrentState: number;
}

interface AppStateContextType {
  appState: AppStateInfo;
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
  getTimeInCurrentState: () => number;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const appStateData = useAppState();

  return (
    <AppStateContext.Provider value={appStateData}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppStateContext = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppStateContext must be used within an AppStateProvider');
  }
  return context;
};

export default AppStateProvider;
