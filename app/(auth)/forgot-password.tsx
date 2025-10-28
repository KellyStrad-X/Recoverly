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
    // Reset states
    setError('');
    setSuccess(false);

    // Validation
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
            <Text variant="displaySmall" style={styles.title}>
              Reset Password
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password
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
                  mode="outlined"
                  style={styles.input}
                  error={!!error && !isValidEmail(email) && email.length > 0}
                  disabled={loading}
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
                <Text variant="bodyLarge" style={styles.successMessage}>
                  We've sent a password reset link to:
                </Text>
                <Text variant="bodyLarge" style={styles.emailText}>
                  {email}
                </Text>
                <Text variant="bodyMedium" style={styles.successInstructions}>
                  Click the link in the email to reset your password. If you don't see it, check
                  your spam folder.
                </Text>
              </View>
            )}

            <Button
              mode="text"
              onPress={handleBackToLogin}
              disabled={loading}
              style={styles.backButton}
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
    backgroundColor: '#FAFAFA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    color: '#2E7D32',
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    color: '#546E7A',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    marginTop: -8,
    marginBottom: 8,
  },
  resetButton: {
    borderRadius: 8,
    marginBottom: 24,
    backgroundColor: '#2E7D32',
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 24,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  successTitle: {
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 16,
  },
  successMessage: {
    color: '#1B5E20',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  successInstructions: {
    color: '#546E7A',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    alignSelf: 'center',
  },
});
