/**
 * Custom hook that returns the current theme colors
 * Provides a convenient way to access theme colors in components
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface Theme {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

export function useTheme(): Theme {
  const colorScheme = useColorScheme() ?? 'light';
  return Colors[colorScheme];
}
