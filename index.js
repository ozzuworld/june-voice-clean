import { registerGlobals } from '@livekit/react-native';
import 'expo/build/Expo.fx';

// Register LiveKit WebRTC globals before app code runs
try {
  registerGlobals();
  console.log('✅ LiveKit WebRTC globals registered');
} catch (e) {
  console.log('⚠️ Failed to register LiveKit globals', e);
}

// Keep existing Expo Router entry
import 'expo-router/entry';
