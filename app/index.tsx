// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isLoading, user, error } = useAuth();

  console.log('🏠 Index route state:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    error
  });

  if (isLoading) {
    console.log('⏳ Showing loading screen');
    return <LoadingScreen />;
  }

  // Redirect based on authentication status
  if (isAuthenticated) {
    console.log('✅ User authenticated, redirecting to chat');
    return <Redirect href="/(tabs)/chat" />;
  }

  console.log('🚫 User not authenticated, redirecting to login');
  return <Redirect href="/(auth)/login" />;
}