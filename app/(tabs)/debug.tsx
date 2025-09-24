
import React from 'react';
import { SafeAreaView } from 'react-native';
import { AndroidAudioTest } from '@/components/AndroidAudioTest';  // FIXED: Use alias

export default function DebugScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AndroidAudioTest />
    </SafeAreaView>
  );
}

// STEP 3: Alternative - If alias doesn't work, use relative path
// Replace the import in debug.tsx with:
// import { AndroidAudioTest } from '../../components/AndroidAudioTest';