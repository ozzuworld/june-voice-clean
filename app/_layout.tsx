import { Stack } from 'expo-router';
import React from 'react';
import { registerGlobals } from '@livekit/react-native-webrtc';

try {
  registerGlobals();
  console.log('✅ WebRTC globals registered');
} catch (e) {
  console.log('🔴 Failed to register WebRTC globals', e);
}

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
