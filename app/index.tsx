// app/index.tsx — Clean redirect logic with loading
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ThemedText } from '@/components/ThemedText';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ThemedText style={{ fontSize: 32, marginBottom: 20, color: '#fff' }}>OZZU</ThemedText>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  
  return <Redirect href="/(tabs)/chat" />;
}