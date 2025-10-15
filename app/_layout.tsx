import { Stack } from 'expo-router';
import React from 'react';
import { registerGlobals } from '@livekit/react-native-webrtc';
import { AuthProvider } from '@/hooks/useAuth';

try {
  registerGlobals();
  console.log('✅ WebRTC globals registered');
} catch (e) {
  console.log('🔴 Failed to register WebRTC globals', e);
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
