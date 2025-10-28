import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            Recoverly
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Your AI-powered recovery companion
          </Text>
        </View>

        <View style={styles.content}>
          <Surface style={styles.card} elevation={0}>
            <Text variant="headlineSmall" style={styles.cardTitle}>
              How it works
            </Text>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="titleMedium">Describe your pain</Text>
                <Text variant="bodyMedium" style={styles.stepDescription}>
                  Tell us about your movement limitations or discomfort in natural language
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="titleMedium">Get your protocol</Text>
                <Text variant="bodyMedium" style={styles.stepDescription}>
                  Receive a personalized recovery plan within 60 seconds
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="titleMedium">Track progress</Text>
                <Text variant="bodyMedium" style={styles.stepDescription}>
                  Monitor your recovery with simple, effective tracking tools
                </Text>
              </View>
            </View>
          </Surface>

          <Text variant="bodySmall" style={styles.disclaimer}>
            Not a substitute for professional medical advice
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => router.push('/(auth)/signup')}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Get Started
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.push('/(auth)/login')}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            I have an account
          </Button>
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
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    color: '#2E7D32',
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#546E7A',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    marginBottom: 24,
    color: '#1A1C1E',
    fontWeight: '600',
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepDescription: {
    color: '#546E7A',
    marginTop: 4,
    lineHeight: 20,
  },
  disclaimer: {
    textAlign: 'center',
    color: '#9E9E9E',
    fontStyle: 'italic',
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 30,
  },
  primaryButton: {
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#2E7D32',
  },
  secondaryButton: {
    borderRadius: 8,
    borderColor: '#E0E0E0',
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});