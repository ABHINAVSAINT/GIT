import { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors as rawColors, spacing, borderRadius, typography, shadows } from '../tokens';

export interface Theme {
  dark: boolean;
  colors: typeof rawColors & {
    background: string;
    surface: string;
    surfaceVariant: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderLight: string;
    card: string;
    overlay: string;
    tabBar: string;
    tabBarBorder: string;
  };
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  shadows: typeof shadows;
}

function buildTheme(dark: boolean): Theme {
  return {
    dark,
    colors: {
      ...rawColors,
      background: dark ? rawColors.gray950 : rawColors.gray50,
      surface: dark ? rawColors.gray900 : rawColors.white,
      surfaceVariant: dark ? rawColors.gray800 : rawColors.gray100,
      text: dark ? rawColors.gray100 : rawColors.gray900,
      textSecondary: dark ? rawColors.gray400 : rawColors.gray500,
      textTertiary: dark ? rawColors.gray500 : rawColors.gray400,
      border: dark ? rawColors.gray700 : rawColors.gray200,
      borderLight: dark ? rawColors.gray800 : rawColors.gray100,
      card: dark ? rawColors.gray900 : rawColors.white,
      overlay: dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
      tabBar: dark ? rawColors.gray900 : rawColors.white,
      tabBarBorder: dark ? rawColors.gray800 : rawColors.gray200,
    },
    spacing,
    borderRadius,
    typography,
    shadows,
  };
}

const ThemeContext = createContext<Theme>(buildTheme(false));

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

interface Props {
  children: ReactNode;
}

export function ThemeProvider({ children }: Props) {
  const systemScheme = useColorScheme();
  const [userDark, setUserDark] = useState<boolean | null>(null);
  const dark = userDark ?? systemScheme === 'dark';
  const theme = useMemo(() => buildTheme(dark), [dark]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
