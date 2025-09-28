// app/index.tsx - Enhanced with better error handling and debugging
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ThemedText } from '@/components/ThemedText';

export default function Index() {
  const { isAuthenticated, isLoading, error } = useAuth();
  const router = useRouter();
  const [navigationAttempts, setNavigationAttempts] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    console.log('🏠 Index screen - Auth state:', { isAuthenticated, isLoading, error });
    
    if (!isLoading) {
      const navigate = async () => {
        try {
          setNavigationAttempts(prev => prev + 1);
          
          if (isAuthenticated) {
            console.log('✅ User authenticated, navigating to chat...');
            setDebugInfo('Navigating to chat...');
            
            // Use replace to prevent back navigation and add small delay for safety
            setTimeout(() => {
              router.replace('/(tabs)/chat');
            }, 100);
          } else {
            console.log('❌ User not authenticated, navigating to login...');
            setDebugInfo('Navigating to login...');
            
            setTimeout(() => {
              router.replace('/(auth)/login');
            }, 100);
          }
        } catch (navError) {
          console.error('Navigation error:', navError);
          setDebugInfo(`Navigation error: ${navError}`);
          
          // Fallback: try direct navigation after delay
          setTimeout(() => {
            if (isAuthenticated) {
              router.push('/chat');
            } else {
              router.push('/login');
            }
          }, 1000);
        }
      };
      
      navigate();
    }
  }, [isAuthenticated, isLoading, router, error]);

  // Prevent infinite loops
  useEffect(() => {
    if (navigationAttempts > 5) {
      console.error('🚨 Too many navigation attempts, something is wrong');
      setDebugInfo('Navigation error - too many attempts');
    }
  }, [navigationAttempts]);

  // Show loading screen
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#000',
      padding: 20,
    }}>
      <ThemedText style={{ fontSize: 32, marginBottom: 20, color: '#fff' }}>
        OZZU
      </ThemedText>
      
      <ActivityIndicator size="large" color="#667eea" />
      
      <ThemedText style={{ fontSize: 14, color: '#666', marginTop: 10, textAlign: 'center' }}>
        {isLoading ? 'Checking authentication...' : debugInfo || 'Navigating...'}
      </ThemedText>
      
      {error && (
        <ThemedText style={{ fontSize: 12, color: '#ff4757', marginTop: 10, textAlign: 'center' }}>
          Auth Error: {error}
        </ThemedText>
      )}
      
      {navigationAttempts > 3 && (
        <ThemedText style={{ fontSize: 12, color: '#ffa502', marginTop: 10, textAlign: 'center' }}>
          Navigation attempts: {navigationAttempts}
        </ThemedText>
      )}
      
      {/* Debug info */}
      {__DEV__ && (
        <ThemedText style={{ fontSize: 10, color: '#333', marginTop: 20, textAlign: 'center' }}>
          Debug: Auth={isAuthenticated ? 'true' : 'false'}, Loading={isLoading ? 'true' : 'false'}
        </ThemedText>
      )}
    </View>
  );
}