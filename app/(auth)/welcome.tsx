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
            source={require('../../misc/RecoverlyLogoHD.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="bodyLarge" style={styles.tagline}>
            AI-powered guidance to help you move better and feel stronger. Describe your issue, get a personalized plan, and track your recovery.
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
    marginTop: 60,
    paddingHorizontal: 16,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 32,
  },
  tagline: {
    color: '#C7C7CC',
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 340,
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