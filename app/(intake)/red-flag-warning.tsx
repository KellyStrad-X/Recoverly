import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RedFlag {
  severity: 'high' | 'moderate';
  reason: string;
  recommendation: string;
}

export default function RedFlagWarningScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse red flags from URL params
  const redFlags: RedFlag[] = params.redFlags
    ? JSON.parse(params.redFlags as string)
    : [];

  const isHighSeverity = redFlags.some((flag) => flag.severity === 'high');

  const handleFindProvider = () => {
    // TODO: Implement healthcare provider finder or external link
    // For now, just log
    console.log('Find healthcare provider');
  };

  const handleContinueAnyway = async () => {
    // Log that user acknowledged warning
    // TODO: Log to Firebase Analytics
    console.log('User continued despite warning');

    // Go back to chat
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Warning Icon */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="alert"
            size={64}
            color={isHighSeverity ? '#FF453A' : '#FF9F0A'}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isHighSeverity
            ? 'We Recommend Medical Attention'
            : 'Consider Professional Consultation'}
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          {isHighSeverity
            ? 'Based on your symptoms, we strongly recommend consulting a healthcare provider before proceeding with any recovery program.'
            : 'Your symptoms suggest that professional evaluation may be beneficial before starting a self-guided recovery program.'}
        </Text>

        {/* Red Flags List */}
        <View style={styles.flagsContainer}>
          {redFlags.map((flag, index) => (
            <View key={index} style={styles.flagCard}>
              <View style={styles.flagHeader}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={flag.severity === 'high' ? '#FF453A' : '#FF9F0A'}
                />
                <Text style={styles.flagSeverity}>
                  {flag.severity === 'high' ? 'High Priority' : 'Recommended'}
                </Text>
              </View>
              <Text style={styles.flagReason}>{flag.reason}</Text>
              <Text style={styles.flagRecommendation}>{flag.recommendation}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Recoverly provides general wellness guidance, not medical advice. For
            symptoms that concern you, professional evaluation is always the safest
            choice.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleFindProvider}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.primaryButtonLabel}
          >
            Find Healthcare Provider
          </Button>

          {!isHighSeverity && (
            <Button
              mode="text"
              onPress={handleContinueAnyway}
              style={styles.secondaryButton}
              labelStyle={styles.secondaryButtonLabel}
            >
              Continue Anyway
            </Button>
          )}

          {isHighSeverity && (
            <Button
              mode="text"
              onPress={() => router.back()}
              style={styles.secondaryButton}
              labelStyle={styles.secondaryButtonLabel}
            >
              Go Back
            </Button>
          )}
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
    paddingVertical: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  flagsContainer: {
    marginBottom: 24,
  },
  flagCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  flagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  flagSeverity: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  flagReason: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
  },
  flagRecommendation: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 21,
  },
  disclaimer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    marginTop: 'auto',
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: '#66BB6A',
    marginBottom: 12,
  },
  buttonContent: {
    height: 56,
  },
  primaryButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    marginTop: 8,
  },
  secondaryButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#66BB6A',
  },
});
