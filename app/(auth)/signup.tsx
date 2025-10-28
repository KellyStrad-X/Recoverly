import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, HelperText, IconButton, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signUpWithEmail, isValidEmail, isValidPassword } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);

  const handleSignUp = async () => {
    setError('');

    if (!displayName || !email || !password) {
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

    if (!acceptedTerms) {
      setError('Please accept the terms to continue');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signUpWithEmail(email, password, displayName);

      setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
        displayName: displayName,
      });

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
            <Text variant="headlineLarge" style={styles.title}>
              Get Started
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Create your account
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Full Name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              mode="flat"
              style={styles.input}
              disabled={loading}
              textColor="#FFFFFF"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              theme={{ colors: { onSurfaceVariant: '#8E8E93' } }}
            />

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
              error={!!error && password.length > 0 && !isValidPassword(password)}
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
            <HelperText type="info" visible={true} style={styles.helperText}>
              At least 6 characters
            </HelperText>

            {error ? (
              <HelperText type="error" visible={!!error} style={styles.errorText}>
                {error}
              </HelperText>
            ) : null}

            <View style={styles.termsContainer}>
              <Checkbox
                status={acceptedTerms ? 'checked' : 'unchecked'}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                color="#66BB6A"
                uncheckedColor="#8E8E93"
              />
              <TouchableOpacity onPress={() => setAcceptedTerms(!acceptedTerms)} style={styles.termsTextContainer}>
                <Text variant="bodySmall" style={styles.termsText}>
                  I accept the terms and understand this is general wellness guidance, not medical advice
                </Text>
              </TouchableOpacity>
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

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => {
                  setError('Google sign-up coming soon');
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

            <View style={styles.loginContainer}>
              <Text variant="bodyMedium" style={styles.loginText}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleLogin} disabled={loading}>
                <Text style={styles.loginLink}>Sign In</Text>
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
  helperText: {
    marginTop: -8,
    marginBottom: 8,
    color: '#8E8E93',
  },
  errorText: {
    marginTop: -8,
    marginBottom: 8,
    color: '#FF453A',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: -8,
    marginTop: 8,
  },
  termsText: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
  },
  signupButton: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#8E8E93',
    fontSize: 15,
  },
  loginLink: {
    color: '#66BB6A',
    fontSize: 15,
    fontWeight: '600',
  },
});
