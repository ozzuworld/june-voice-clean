// app/index.tsx — STABLE VERSION - Prevents AuthProvider remount
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ThemedText } from '@/components/ThemedText';
import { useCallback } from 'react';

export default function Index() {
  // Get auth state
  const { isAuthenticated, isLoading, user, contextId } = useAuth();
  const router = useRouter();
  
  console.log(`📱 Index render - Context: ${contextId}, Auth: ${isAuthenticated}, Loading: ${isLoading}`);

  // Use useFocusEffect instead of useEffect to handle navigation properly
  useFocusEffect(
    useCallback(() => {
      console.log(`🎯 Index focused - Auth: ${isAuthenticated}, Loading: ${isLoading}`);
      
      if (!isLoading) {
        if (isAuthenticated) {
          console.log(`✅ Authenticated - navigating to tabs...`);
          // Use replace to prevent back navigation to index
          router.replace('/(tabs)/chat');
        } else {
          console.log(`❌ Not authenticated - navigating to login...`);
          router.replace('/(auth)/login');
        }
      }
    }, [isAuthenticated, isLoading, router])
  );

  // Show loading while auth is being determined
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#000' 
    }}>
      <ThemedText style={{ fontSize: 32, marginBottom: 20, color: '#fff' }}>
        OZZU
      </ThemedText>
      <ActivityIndicator size="large" color="#667eea" />
      <ThemedText style={{ fontSize: 14, color: '#666', marginTop: 10 }}>
        {isLoading ? 'Checking authentication...' : 'Navigating...'}
      </ThemedText>
      <ThemedText style={{ fontSize: 12, color: '#444', marginTop: 5 }}>
        Context: {contextId?.substring(0, 8)}
      </ThemedText>
    </View>
  );
}