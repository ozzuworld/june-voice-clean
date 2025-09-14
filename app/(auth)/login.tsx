// app/(auth)/login.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { signIn, error, clearError, isAuthenticated, isLoading } = useAuth();
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [scaleAnim] = React.useState(new Animated.Value(0.8));
  const [localLoading, setLocalLoading] = useState(false);

  // Add debugging for login screen
  useEffect(() => {
    console.log('🔐 Login screen - auth state:', {
      isAuthenticated,
      isLoading,
      localLoading,
      error
    });
  }, [isAuthenticated, isLoading, localLoading, error]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log('✅ Login screen - user authenticated, redirecting to chat...');
      router.replace('/(tabs)/chat');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (error) {
      console.log('❌ Login error:', error);
      setLocalLoading(false);
      Alert.alert('Authentication Error', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error, clearError]);

  const handleSignIn = async () => {
    try {
      console.log('🚀 Login button pressed, starting authentication...');
      setLocalLoading(true);
      await signIn();
    } catch (error) {
      console.error('💥 Login error:', error);
      setLocalLoading(false);
      Alert.alert('Authentication Error', 'Failed to sign in. Please try again.');
    }
  };

  // Don't render if already authenticated and not loading
  if (isAuthenticated && !isLoading) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>J</Text>
            </View>
            <Text style={styles.brandName}>JUNE</Text>
            <Text style={styles.tagline}>Your AI Voice Companion</Text>
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome to the Future</Text>
            <Text style={styles.welcomeSubtitle}>
              Experience seamless AI interaction with advanced voice capabilities and intelligent responses.
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🎤</Text>
              <Text style={styles.featureText}>Natural Voice Chat</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🧠</Text>
              <Text style={styles.featureText}>Smart AI Assistant</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureText}>Lightning Fast Responses</Text>
            </View>
          </View>

          {/* Login Button */}
          <View style={styles.actionContainer}>
            <Button
              title="Sign In with Keycloak"
              onPress={handleSignIn}
              style={styles.signInButton}
              textStyle={styles.signInButtonText}
              loading={localLoading || isLoading}
              disabled={localLoading || isLoading}
            />
          </View>

          {/* Technical Info */}
          <View style={styles.techInfo}>
            <Text style={styles.techText}>
              Secure OAuth 2.0 + PKCE Authentication
            </Text>
            <Text style={styles.techDetails}>
              Using expo-auth-session for secure authentication
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#667eea',
  },
  brandName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 3,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    marginBottom: 50,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 250,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    flex: 1,
  },
  actionContainer: {
    width: '100%',
    marginBottom: 30,
  },
  signInButton: {
    backgroundColor: 'white',
    borderRadius: 30,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  signInButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  techInfo: {
    alignItems: 'center',
    opacity: 0.7,
  },
  techText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  techDetails: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
  },
});