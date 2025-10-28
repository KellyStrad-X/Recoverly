import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Custom theme colors - minimalist, clinical but modern
const lightColors = {
  primary: '#2E7D32', // Professional green
  onPrimary: '#FFFFFF',
  primaryContainer: '#C8E6C9',
  onPrimaryContainer: '#00210B',
  secondary: '#546E7A',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#CFD8DC',
  onSecondaryContainer: '#001F2A',
  tertiary: '#FF6B35',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFDBCF',
  onTertiaryContainer: '#341100',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#FAFAFA',
  onBackground: '#1A1C1E',
  surface: '#FFFFFF',
  onSurface: '#1A1C1E',
  surfaceVariant: '#F5F5F5',
  onSurfaceVariant: '#424242',
  outline: '#E0E0E0',
  outlineVariant: '#F5F5F5',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#2F3133',
  inverseOnSurface: '#F0F0F3',
  inversePrimary: '#81C784',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#FAFAFA',
    level3: '#F5F5F5',
    level4: '#F0F0F0',
    level5: '#EBEBEB',
  },
  surfaceDisabled: 'rgba(26, 28, 30, 0.12)',
  onSurfaceDisabled: 'rgba(26, 28, 30, 0.38)',
  backdrop: 'rgba(44, 49, 55, 0.4)',
};

const darkColors = {
  ...lightColors,
  // We'll keep it light theme only for MVP
  // Can add dark theme support later
};

const lightTheme = {
  ...MD3LightTheme,
  colors: lightColors,
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: darkColors,
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    // Hide splash screen once the app is ready
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={lightTheme}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: lightTheme.colors.background,
            },
            headerTintColor: lightTheme.colors.onBackground,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: lightTheme.colors.background,
            },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}