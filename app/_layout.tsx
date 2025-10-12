// ============================================================================
// FILE 2: apps/expo/app/_layout.tsx
// REPLACE ENTIRE FILE
// ============================================================================
import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout() {
  console.log('🏗️ RootLayout rendering...');
  
  return (
    <AuthProvider>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}
