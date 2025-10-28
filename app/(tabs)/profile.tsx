import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Surface, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { signOut } from '@/services/authService';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.signOut);
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await signOut();
            clearUser();
            router.replace('/(auth)/welcome');
          } catch (error) {
            console.error('Sign out error:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Profile
          </Text>
        </View>

        <Surface style={styles.card} elevation={0}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text variant="headlineLarge" style={styles.avatarText}>
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text variant="titleLarge" style={styles.name}>
              {user?.displayName || 'User'}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {user?.email}
            </Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.subscriptionSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Subscription
            </Text>
            <View style={styles.subscriptionBadge}>
              <Text variant="labelLarge" style={styles.subscriptionText}>
                {user?.subscriptionStatus === 'active' ? 'PREMIUM' : 'FREE'}
              </Text>
            </View>
            {user?.subscriptionStatus === 'free' && (
              <Text variant="bodySmall" style={styles.subscriptionHint}>
                Upgrade to unlock personalized recovery plans
              </Text>
            )}
          </View>
        </Surface>

        <Surface style={styles.card} elevation={0}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Settings
          </Text>

          <Button
            mode="outlined"
            onPress={() => {
              // TODO: Navigate to account settings
              console.log('Account settings');
            }}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}
            labelStyle={styles.menuButtonLabel}
          >
            Account Settings
          </Button>

          <Button
            mode="outlined"
            onPress={() => {
              // TODO: Navigate to subscription management
              console.log('Manage subscription');
            }}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}
            labelStyle={styles.menuButtonLabel}
          >
            Manage Subscription
          </Button>

          <Button
            mode="outlined"
            onPress={() => {
              // TODO: Navigate to help/support
              console.log('Help & Support');
            }}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}
            labelStyle={styles.menuButtonLabel}
          >
            Help & Support
          </Button>
        </Surface>

        <Surface style={styles.card} elevation={0}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Legal
          </Text>

          <Button
            mode="text"
            onPress={() => {
              // TODO: Open terms of service
              console.log('Terms of Service');
            }}
            style={styles.legalButton}
          >
            Terms of Service
          </Button>

          <Button
            mode="text"
            onPress={() => {
              // TODO: Open privacy policy
              console.log('Privacy Policy');
            }}
            style={styles.legalButton}
          >
            Privacy Policy
          </Button>
        </Surface>

        <Button
          mode="contained"
          onPress={handleSignOut}
          loading={loading}
          disabled={loading}
          style={styles.signOutButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.signOutLabel}
          buttonColor="#D32F2F"
        >
          Sign Out
        </Button>

        <Text variant="bodySmall" style={styles.version}>
          Recoverly v1.0.0 (MVP)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    color: '#1A1C1E',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  profileInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  name: {
    color: '#1A1C1E',
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: '#546E7A',
  },
  divider: {
    marginVertical: 16,
  },
  subscriptionSection: {
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#1A1C1E',
    fontWeight: '600',
    marginBottom: 12,
  },
  subscriptionBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  subscriptionText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  subscriptionHint: {
    color: '#757575',
    textAlign: 'center',
  },
  menuButton: {
    marginBottom: 12,
    borderRadius: 8,
    borderColor: '#E0E0E0',
  },
  menuButtonContent: {
    height: 48,
    justifyContent: 'flex-start',
  },
  menuButtonLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1C1E',
  },
  legalButton: {
    marginBottom: 4,
  },
  signOutButton: {
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 24,
  },
  buttonContent: {
    height: 48,
  },
  signOutLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    color: '#9E9E9E',
    textAlign: 'center',
  },
});
