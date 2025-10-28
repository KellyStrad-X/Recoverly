import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
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

          <View style={styles.subscriptionBadge}>
            <Text variant="labelSmall" style={styles.subscriptionText}>
              {user?.subscriptionStatus === 'active' ? 'PREMIUM' : 'FREE PLAN'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            SETTINGS
          </Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              // TODO: Navigate to account settings
              console.log('Account settings');
            }}
          >
            <Text variant="bodyLarge" style={styles.menuItemText}>
              Account Settings
            </Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              // TODO: Navigate to subscription management
              console.log('Manage subscription');
            }}
          >
            <Text variant="bodyLarge" style={styles.menuItemText}>
              Subscription
            </Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              // TODO: Navigate to help/support
              console.log('Help & Support');
            }}
          >
            <Text variant="bodyLarge" style={styles.menuItemText}>
              Help & Support
            </Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            LEGAL
          </Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              // TODO: Open terms of service
              console.log('Terms of Service');
            }}
          >
            <Text variant="bodyMedium" style={styles.legalItemText}>
              Terms of Service
            </Text>
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              // TODO: Open privacy policy
              console.log('Privacy Policy');
            }}
          >
            <Text variant="bodyMedium" style={styles.legalItemText}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          mode="text"
          onPress={handleSignOut}
          loading={loading}
          disabled={loading}
          style={styles.signOutButton}
          labelStyle={styles.signOutLabel}
        >
          Sign Out
        </Button>

        <Text variant="bodySmall" style={styles.version}>
          Recoverly v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  avatarText: {
    color: '#66BB6A',
    fontWeight: '700',
  },
  name: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: '#8E8E93',
    marginBottom: 16,
  },
  subscriptionBadge: {
    backgroundColor: user?.subscriptionStatus === 'active' ? '#2C3E2F' : '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: user?.subscriptionStatus === 'active' ? '#66BB6A' : '#2C2C2E',
  },
  subscriptionText: {
    color: user?.subscriptionStatus === 'active' ? '#66BB6A' : '#8E8E93',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#8E8E93',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  menuItemChevron: {
    color: '#8E8E93',
    fontSize: 24,
    fontWeight: '300',
  },
  legalItemText: {
    color: '#8E8E93',
    fontSize: 15,
  },
  menuDivider: {
    backgroundColor: '#1C1C1E',
  },
  signOutButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  signOutLabel: {
    color: '#FF453A',
    fontSize: 17,
    fontWeight: '600',
  },
  version: {
    color: '#48484A',
    textAlign: 'center',
    fontSize: 13,
  },
});
