import { Stack } from 'expo-router';
import React from 'react';
import { registerGlobals } from '@livekit/react-native';
import { AuthProvider } from '@/hooks/useAuth';

// Early polyfills for RN/Hermes
import 'react-native-webrtc';
import 'react-native-get-random-values';
try {
  const te = require('text-encoding');
  if (typeof global.TextEncoder === 'undefined') {
    // @ts-ignore
    global.TextEncoder = te.TextEncoder;
  }
  if (typeof global.TextDecoder === 'undefined') {
    // @ts-ignore
    global.TextDecoder = te.TextDecoder;
  }
} catch (e) {
  console.log('TextEncoder/TextDecoder polyfill not loaded:', e?.message || String(e));
}

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
