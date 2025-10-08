// app/_layout.tsx - Clean layout after removing unused voice hooks
import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { ChatProvider } from '@/hooks/useChat';

export default function RootLayout() {
  console.log('🏗️ RootLayout rendering...');
  
  return (
    <AuthProvider>
      <ChatProvider>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            animation: 'none', // Prevent animation issues
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ChatProvider>
    </AuthProvider>
  );
}