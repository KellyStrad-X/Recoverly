import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, HelperText, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signInWithEmail, isValidEmail } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async () => {
    // Reset error
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmail(email, password);

      // Update auth store
      setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
        displayName: userCredential.user.displayName || 'User',
      });

      // Navigation will be handled by auth state listener in root layout
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
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
              Welcome Back
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Sign in to continue
            </Text>
          </View>

          <View style={styles.form}>
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

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="flat"
              style={styles.input}
              error={!!error}
              disabled={loading}
              textColor="#FFFFFF"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              theme={{ colors: { onSurfaceVariant: '#8E8E93' } }}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                  color="#8E8E93"
                />
              }
            />

            {error ? (
              <HelperText type="error" visible={!!error} style={styles.errorText}>
                {error}
              </HelperText>
            ) : null}

            <Button
              mode="text"
              onPress={handleForgotPassword}
              style={styles.forgotButton}
              disabled={loading}
              labelStyle={styles.forgotButtonLabel}
            >
              Forgot password?
            </Button>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Sign In
            </Button>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => {
                  // TODO: Implement Google OAuth in Phase 2
                  setError('Google sign-in coming soon');
                }}
                disabled={loading}
              >
                <IconButton
                  icon="google"
                  size={24}
                  iconColor="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.signupContainer}>
              <Text variant="bodyMedium" style={styles.signupText}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleSignUp} disabled={loading}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
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
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 17,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotButtonLabel: {
    color: '#66BB6A',
    fontSize: 15,
  },
  loginButton: {
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2C2C2E',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#8E8E93',
    fontSize: 15,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signupText: {
    color: '#8E8E93',
    fontSize: 15,
  },
  signupLink: {
    color: '#66BB6A',
    fontSize: 15,
    fontWeight: '600',
  },
});
