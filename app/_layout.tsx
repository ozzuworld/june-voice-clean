// app/_layout.tsx — wraps routes with AuthProvider
import { Stack } from 'expo-router';
import { AuthProvider } from '../hooks/useAuth';


export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
