import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { resetPassword, isValidEmail } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text variant="headlineLarge" style={styles.title}>
              Reset Password
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              We'll send you a link to reset your password
            </Text>
          </View>

          <View style={styles.form}>
            {!success ? (
              <>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  mode="flat"
                  style={styles.input}
                  error={!!error && !isValidEmail(email) && email.length > 0}
                  disabled={loading}
                  textColor="#FFFFFF"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  theme={{ colors: { onSurfaceVariant: '#8E8E93' } }}
                />

                {error ? (
                  <HelperText type="error" visible={!!error} style={styles.errorText}>
                    {error}
                  </HelperText>
                ) : null}

                <Button
                  mode="contained"
                  onPress={handleResetPassword}
                  loading={loading}
                  disabled={loading}
                  style={styles.resetButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  Send Reset Link
                </Button>
              </>
            ) : (
              <View style={styles.successContainer}>
                <Text variant="headlineSmall" style={styles.successTitle}>
                  Check Your Email
                </Text>
                <Text variant="bodyMedium" style={styles.successMessage}>
                  We've sent a password reset link to
                </Text>
                <Text variant="bodyLarge" style={styles.emailText}>
                  {email}
                </Text>
                <Text variant="bodyMedium" style={styles.successInstructions}>
                  Click the link in the email to reset your password. If you don't see it, check your spam folder.
                </Text>
              </View>
            )}

            <Button
              mode="text"
              onPress={handleBackToLogin}
              disabled={loading}
              style={styles.backButton}
              labelStyle={styles.backButtonLabel}
            >
              ← Back to Login
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 17,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    fontSize: 17,
  },
  errorText: {
    marginTop: -8,
    marginBottom: 8,
    color: '#FF453A',
  },
  resetButton: {
    borderRadius: 14,
    marginBottom: 24,
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
  successContainer: {
    backgroundColor: '#1C1C1E',
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  successTitle: {
    color: '#66BB6A',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    color: '#C7C7CC',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  successInstructions: {
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 16,
  },
  backButtonLabel: {
    color: '#8E8E93',
    fontSize: 15,
  },
});
