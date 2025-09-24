// app/(auth)/login.tsx - Simple clean login screen
import { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function Login() {
  const colorScheme = useColorScheme();
  const { signIn, isLoading, error, clearError } = useAuth();
  const colors = Colors[colorScheme ?? 'light'];

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('Authentication Error', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error, clearError]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Brand */}
        <View style={styles.brandContainer}>
          <ThemedText style={styles.brandText}>OZZU</ThemedText>
          <ThemedText style={styles.tagline}>AI Voice Assistant</ThemedText>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeContainer}>
          <ThemedText style={styles.welcomeTitle}>Welcome</ThemedText>
          <ThemedText style={styles.welcomeSubtitle}>
            Sign in to start your conversation
          </ThemedText>
        </View>

        {/* Sign In Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={isLoading ? 'Opening browser...' : 'Sign In'}
            onPress={signIn}
            loading={isLoading}
            disabled={isLoading}
            style={styles.signInButton}
          />
        </View>

        {/* Loading State Info */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
              Complete sign-in in the browser that opened
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandText: {
    fontSize: 48,
    fontWeight: '100',
    letterSpacing: 8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    opacity: 0.7,
    letterSpacing: 2,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  signInButton: {
    paddingVertical: 16,
    borderRadius: 12,
  },
  errorContainer: {
    width: '100%',
    maxWidth: 320,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  tryAgainButton: {
    minWidth: 100,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
});