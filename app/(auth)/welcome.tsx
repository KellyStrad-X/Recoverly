import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../../misc/RecoverlyLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="displayMedium" style={styles.title}>
            Recoverly
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Describe your pain. Get a plan.
          </Text>
        </View>

        <View style={styles.spacer} />

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
            mode="text"
            onPress={() => router.push('/(auth)/login')}
            style={styles.secondaryButton}
            labelStyle={styles.secondaryButtonLabel}
          >
            I have an account
          </Button>

          <Text variant="bodySmall" style={styles.disclaimer}>
            Not a substitute for professional medical advice
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
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#8E8E93',
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 60,
  },
  primaryButton: {
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#66BB6A',
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    marginBottom: 32,
  },
  secondaryButtonLabel: {
    fontSize: 17,
    color: '#8E8E93',
  },
  disclaimer: {
    textAlign: 'center',
    color: '#48484A',
    fontSize: 13,
    lineHeight: 18,
  },
});