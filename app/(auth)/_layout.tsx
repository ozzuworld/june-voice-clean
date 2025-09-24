// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../../hooks/useAuth'; // <-- two dots, no .min
export default function AuthLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
