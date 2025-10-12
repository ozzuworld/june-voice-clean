// app/(auth)/_layout.tsx — FIXED: Remove duplicate providers
import { Stack } from 'expo-router';

export default function AuthLayout() {
  console.log('🔐 AuthLayout rendering...');
  
  // DO NOT wrap in providers here - they're already in root layout
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'none', // Prevent animation-related unmounts
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}