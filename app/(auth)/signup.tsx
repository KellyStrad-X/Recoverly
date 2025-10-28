import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, Divider, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signUpWithEmail, isValidEmail, isValidPassword } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);

  const handleSignUp = async () => {
    // Reset error
    setError('');

    // Validation
    if (!displayName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (displayName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!isValidPassword(password)) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptedTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signUpWithEmail(email, password, displayName);

      // Update auth store
      setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
        displayName: displayName,
      });

      // Navigate to welcome/intake flow
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
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
              Start Your Recovery
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Create your account to get started
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Full Name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              mode="outlined"
              style={styles.input}
              disabled={loading}
            />

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

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              error={!!error && password.length > 0 && !isValidPassword(password)}
              disabled={loading}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            <HelperText type="info" visible={true} style={styles.helperText}>
              At least 6 characters
            </HelperText>

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              error={!!error && confirmPassword.length > 0 && password !== confirmPassword}
              disabled={loading}
            />

            {error ? (
              <HelperText type="error" visible={!!error} style={styles.errorText}>
                {error}
              </HelperText>
            ) : null}

            <View style={styles.termsContainer}>
              <Checkbox
                status={acceptedTerms ? 'checked' : 'unchecked'}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                color="#2E7D32"
              />
              <View style={styles.termsTextContainer}>
                <Text variant="bodySmall" style={styles.termsText}>
                  I accept the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
            </View>

            <View style={styles.disclaimerContainer}>
              <Text variant="bodySmall" style={styles.disclaimerText}>
                ⚠️ Recoverly provides general wellness guidance only and is not a substitute for
                professional medical advice.
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              style={styles.signupButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Create Account
            </Button>

            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              icon="google"
              onPress={() => {
                // TODO: Implement Google OAuth in Phase 2
                setError('Google sign-up coming soon');
              }}
              disabled={loading}
              style={styles.googleButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.googleButtonLabel}
            >
              Sign up with Google
            </Button>

            <View style={styles.loginContainer}>
              <Text variant="bodyMedium" style={styles.loginText}>
                Already have an account?{' '}
              </Text>
              <Button mode="text" onPress={handleLogin} disabled={loading} style={styles.loginButton}>
                Sign In
              </Button>
            </View>
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
    marginBottom: 32,
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
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    marginTop: -4,
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  termsText: {
    color: '#546E7A',
    lineHeight: 20,
  },
  termsLink: {
    color: '#2E7D32',
    textDecorationLine: 'underline',
  },
  disclaimerContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerText: {
    color: '#E65100',
    lineHeight: 18,
  },
  signupButton: {
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
  divider: {
    marginBottom: 24,
  },
  googleButton: {
    borderRadius: 8,
    borderColor: '#E0E0E0',
    marginBottom: 24,
  },
  googleButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#546E7A',
  },
  loginButton: {
    marginLeft: -8,
  },
});
