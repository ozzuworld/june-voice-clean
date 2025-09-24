// app/index.tsx — minimal redirect logic
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth.min';

export default function Index() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/chat" />; // or your main screen
}
