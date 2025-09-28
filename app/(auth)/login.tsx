// app/(auth)/login.tsx - Enhanced login with better debugging
import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function LoginScreen() {
  const { signIn, isLoading, error, isAuthenticated, clearError } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Auto-navigate if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ Already authenticated, redirecting from login...');
      router.replace('/(tabs)/chat');
    }
  }, [isAuthenticated, router]);

  const handleSignIn = async () => {
    try {
      console.log('🚀 Starting sign in process...');
      clearError();
      await signIn();
    } catch (err) {
      console.error('❌ Sign in failed:', err);
      Alert.alert('Sign In Failed', 'Please try again.');
    }
  };

  const handleClearError = () => {
    clearError();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.content}>
        {/* Logo/Title */}
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: colors.primary }]}>
            OZZU
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your AI Voice Assistant
          </ThemedText>
        </View>

        {/* Login Section */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={[
              styles.signInButton,
              { backgroundColor: colors.primary },
              isLoading && styles.disabledButton
            ]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            <ThemedText style={styles.signInButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In with Keycloak'}
            </ThemedText>
          </TouchableOpacity>

          {/* Error Display */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
              <ThemedText style={[styles.errorText, { color: colors.danger }]}>
                {error}
              </ThemedText>
              <TouchableOpacity onPress={handleClearError} style={styles.clearErrorButton}>
                <ThemedText style={[styles.clearErrorText, { color: colors.danger }]}>
                  Dismiss
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
            Secure authentication powered by Keycloak
          </ThemedText>
        </View>

        {/* Debug Info */}
        {__DEV__ && (
          <View style={styles.debugSection}>
            <ThemedText style={[styles.debugText, { color: colors.textSecondary }]}>
              Debug: Auth={isAuthenticated ? 'true' : 'false'}, Loading={isLoading ? 'true' : 'false'}
            </ThemedText>
            {error && (
              <ThemedText style={[styles.debugText, { color: colors.danger }]}>
                Error: {error}
              </ThemedText>
            )}
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  loginSection: {
    marginBottom: 32,
  },
  signInButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
  },
  clearErrorButton: {
    alignSelf: 'flex-end',
  },
  clearErrorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  debugSection: {
    marginTop: 32,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  debugText: {
    fontSize: 10,
    marginBottom: 4,
  },
});