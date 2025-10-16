// app/_layout.tsx - Simplified without auth for testing
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { registerGlobals } from '@livekit/react-native';

// Import WebRTC from the LiveKit package
import '@livekit/react-native-webrtc';
import 'react-native-get-random-values';

// Polyfill TextEncoder/TextDecoder for Hermes if missing
if (typeof global.TextEncoder === 'undefined') {
  try {
    const textEncoding = require('text-encoding');
    global.TextEncoder = textEncoding.TextEncoder;
    global.TextDecoder = textEncoding.TextDecoder;
  } catch (e) {
    console.warn('⚠️ text-encoding polyfill not available:', e?.message || String(e));
  }
}

export default function RootLayout() {
  useEffect(() => {
    try {
      // Register LiveKit WebRTC globals
      registerGlobals();
      console.log('✅ LiveKit WebRTC globals registered');
    } catch (e) {
      console.error('🔴 Failed to register WebRTC globals:', e);
    }
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}