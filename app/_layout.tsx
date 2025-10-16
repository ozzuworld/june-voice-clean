import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { registerGlobals } from '@livekit/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

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

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add any custom fonts here if needed
  });

  useEffect(() => {
    try {
      // Register LiveKit WebRTC globals
      registerGlobals();
      console.log('✅ LiveKit WebRTC globals registered');
    } catch (e) {
      console.error('🔴 Failed to register WebRTC globals:', e);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}