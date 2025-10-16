import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AudioSession, registerGlobals } from '@livekit/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import JuneVoiceApp from './src/JuneVoiceApp';

// Ensure globals are registered
registerGlobals();

export default function App() {
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await AudioSession.startAudioSession();
        console.log('Audio session started successfully');
      } catch (error) {
        console.error('Failed to start audio session:', error);
      }
    };

    setupAudio();

    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar style="light" />
      <JuneVoiceApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
});