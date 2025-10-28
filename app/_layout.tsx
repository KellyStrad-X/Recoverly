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

function useProtectedRoute(user: any) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to welcome if not authenticated
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      // Redirect to dashboard if authenticated
      router.replace('/(tabs)/dashboard');
    }
  }, [user, segments]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [initializing, setInitializing] = useState(true);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useProtectedRoute(user);

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
          subscriptionStatus: profile?.subscriptionStatus || 'free',
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
        <PaperProvider theme={lightTheme}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
            <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

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