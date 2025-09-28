// app/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { ChatProvider } from '@/hooks/useChat';
import { VoiceProvider } from '@/hooks/useVoice';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ChatProvider>
        <VoiceProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </VoiceProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
