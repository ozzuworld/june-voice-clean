// app/_layout.tsx - FIXED: Use the real ChatProvider that connects to your API
import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { ChatProvider } from '@/hooks/useChat'; // ← This is the REAL one that connects to your API
import { VoiceProvider } from '@/hooks/useVoice';

export default function RootLayout() {
  console.log('🔧 RootLayout rendering with REAL providers');
  
  return (
    <AuthProvider>
      <ChatProvider> {/* ← This will connect to https://api.allsafe.world */}
        <VoiceProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </VoiceProvider>
      </ChatProvider>
    </AuthProvider>
  );
}