import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.headerTitle}>
          Recovery Plan
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Placeholder Content */}
      <View style={styles.content}>
        <View style={styles.placeholderCard}>
          <MaterialCommunityIcons name="dumbbell" size={64} color="#66BB6A" />
          <Text variant="headlineMedium" style={styles.placeholderTitle}>
            Plan Detail Screen
          </Text>
          <Text variant="bodyMedium" style={styles.placeholderText}>
            This screen will show:
          </Text>
          <Text variant="bodySmall" style={styles.placeholderList}>
            • Full exercise list with instructions{'\n'}
            • Exercise GIFs & YouTube videos{'\n'}
            • Session tracking{'\n'}
            • Progress charts{'\n'}
            • Pain tracking
          </Text>
          <Text variant="bodySmall" style={styles.placeholderNote}>
            Coming soon! (Stub for now)
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderText: {
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  placeholderList: {
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 24,
  },
  placeholderNote: {
    color: '#66BB6A',
    fontWeight: '600',
    textAlign: 'center',
  },
});
