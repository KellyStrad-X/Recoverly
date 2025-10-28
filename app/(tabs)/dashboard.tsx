import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.greeting}>
            Hi, {user?.displayName?.split(' ')[0] || 'there'}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Ready to start your recovery?
          </Text>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>💪</Text>
          </View>
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No Active Protocols
          </Text>
          <Text variant="bodyMedium" style={styles.emptyDescription}>
            Describe your pain or movement issue to get started with a personalized recovery plan.
          </Text>

          <Button
            mode="contained"
            onPress={() => {
              // TODO: Navigate to intake flow in Phase 2
              console.log('Start intake flow');
            }}
            style={styles.startButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Start New Protocol
          </Button>
        </View>
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
    marginTop: 24,
    marginBottom: 40,
  },
  greeting: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 17,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontSize: 15,
  },
  startButton: {
    borderRadius: 14,
    backgroundColor: '#66BB6A',
    minWidth: 200,
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
});
