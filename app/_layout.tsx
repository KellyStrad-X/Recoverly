import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme, MD3DarkTheme, ActivityIndicator } from 'react-native-paper';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuthStore } from '@/stores/authStore';
import { getUserProfile } from '@/services/authService';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Dark minimalist theme - Apple Fitness / Opal inspired
const darkColors = {
  primary: '#66BB6A', // Muted green
  onPrimary: '#000000',
  primaryContainer: '#2C3E2F',
  onPrimaryContainer: '#B8E7BC',
  secondary: '#8E8E93', // iOS secondary gray
  onSecondary: '#FFFFFF',
  secondaryContainer: '#2C2C2E',
  onSecondaryContainer: '#E5E5EA',
  tertiary: '#FF9F0A', // Warning orange
  onTertiary: '#000000',
  tertiaryContainer: '#3D2C1E',
  onTertiaryContainer: '#FFD59E',
  error: '#FF453A', // iOS red
  onError: '#000000',
  errorContainer: '#3D1F1D',
  onErrorContainer: '#FFB4AB',
  background: '#000000', // Pure black for OLED
  onBackground: '#FFFFFF',
  surface: '#1C1C1E', // Apple's dark surface
  onSurface: '#FFFFFF',
  surfaceVariant: '#2C2C2E',
  onSurfaceVariant: '#C7C7CC',
  outline: '#38383A', // Subtle borders
  outlineVariant: '#2C2C2E',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#F2F2F7',
  inverseOnSurface: '#000000',
  inversePrimary: '#4CAF50',
  elevation: {
    level0: 'transparent',
    level1: '#1C1C1E',
    level2: '#2C2C2E',
    level3: '#38383A',
    level4: '#3A3A3C',
    level5: '#48484A',
  },
  surfaceDisabled: 'rgba(255, 255, 255, 0.12)',
  onSurfaceDisabled: 'rgba(255, 255, 255, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.7)',
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: darkColors,
  dark: true,
};

function useProtectedRoute(user: any, initializing: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't navigate while initializing
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to welcome if not authenticated
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      // Redirect to dashboard if authenticated
      router.replace('/(tabs)/dashboard');
    }
  }, [user, segments, initializing]);
}

export default function RootLayout() {
  // Always use dark theme for MVP
  const theme = darkTheme;
  const [initializing, setInitializing] = useState(true);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useProtectedRoute(user, initializing);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch full profile
        const profile = await getUserProfile(firebaseUser.uid);

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || profile?.displayName || 'User',
          // TEMPORARY: Fake subscription for testing - remove when Stripe is integrated
          subscriptionStatus: 'free', // Change to 'active' to test paid flow
          subscriptionTier: profile?.subscriptionTier || null,
        });
      } else {
        // User is signed out
        setUser(null);
      }

      setLoading(false);
      if (initializing) {
        setInitializing(false);
        SplashScreen.hideAsync();
      }
    });

    return unsubscribe;
  }, []);

  // Show loading screen while checking auth state
  if (initializing) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.onBackground,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(intake)" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}