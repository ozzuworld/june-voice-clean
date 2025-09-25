// app/_layout.tsx - FIXED: Ensure AuthProvider never unmounts
import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { ChatProvider } from '@/hooks/useChat';
import { VoiceProvider } from '@/hooks/useVoice';

export default function RootLayout() {
  console.log('🏠 RootLayout rendering...');
  
  return (
    // CRITICAL: AuthProvider must be at the very root and never unmount
    <AuthProvider>
      <ChatProvider>
        <VoiceProvider>
          {/* Use Stack with headerShown: false to prevent navigation-related unmounts */}
          <Stack 
            screenOptions={{ 
              headerShown: false,
              // IMPORTANT: Prevent screen animations that might cause unmounts
              animation: 'none', 
            }}
          >
            {/* Define all possible routes to prevent dynamic loading issues */}
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </VoiceProvider>
      </ChatProvider>
    </AuthProvider>
  );
}