// app/_layout.tsx - FIXED: Ensure proper exports and prevent circular dependencies
import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { ChatProvider } from '@/hooks/useChat';
import { VoiceProvider } from '@/hooks/useVoice';

export default function RootLayout() {
  console.log('🏗️ RootLayout rendering...');
  
  return (
    <AuthProvider>
      <ChatProvider>
        <VoiceProvider>
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
        </VoiceProvider>
      </ChatProvider>
    </AuthProvider>
  );
}