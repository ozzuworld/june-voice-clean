// App.tsx

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LiveKitConnection } from './src/components/LiveKitConnection';

export default function App() {
  return (
    <SafeAreaProvider style={styles.container}>
      <LiveKitConnection />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
});