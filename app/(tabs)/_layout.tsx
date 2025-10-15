import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { registerGlobals } from '@livekit/react-native-webrtc';

// Register WebRTC globals before any LiveKit usage
try {
  registerGlobals();
  console.log('✅ WebRTC globals registered');
} catch (e) {
  console.log('🔴 Failed to register WebRTC globals', e);
}

export default function TabLayout() {
  useEffect(() => {
    // Additional runtime checks can go here if needed
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
