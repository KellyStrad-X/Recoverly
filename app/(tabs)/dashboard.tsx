import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.greeting}>
            Welcome, {user?.displayName || 'User'}!
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Your recovery dashboard
          </Text>
        </View>

        <Surface style={styles.card} elevation={0}>
          <Text variant="titleLarge" style={styles.cardTitle}>
            No Active Conditions
          </Text>
          <Text variant="bodyMedium" style={styles.cardDescription}>
            Start your recovery journey by describing your pain or movement issue.
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
            + Add New Condition
          </Button>
        </Surface>

        <View style={styles.infoContainer}>
          <Text variant="bodySmall" style={styles.infoText}>
            💡 Tip: You can track multiple conditions at once
          </Text>
        </View>
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
  greeting: {
    color: '#1A1C1E',
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#546E7A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardTitle: {
    color: '#1A1C1E',
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#546E7A',
    marginBottom: 24,
    lineHeight: 22,
  },
  startButton: {
    borderRadius: 8,
    backgroundColor: '#2E7D32',
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  infoText: {
    color: '#0D47A1',
    lineHeight: 18,
  },
});
