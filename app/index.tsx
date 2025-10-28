import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Entry point for the app
 * Redirects to either welcome screen (if not authenticated) or dashboard (if authenticated)
 * Auth state is managed in _layout.tsx
 */
export default function Index() {
  const user = useAuthStore((state) => state.user);

  if (user) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}