import { AppRegistry } from 'react-native';
import 'react-native-webrtc';
import 'react-native-get-random-values';

// Polyfill TextEncoder/TextDecoder for Hermes if missing
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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

// Optional: ensure WebSocket present
if (typeof global.WebSocket === 'undefined') {
  console.log('⚠️ WebSocket missing on global');
}

import App from './App';
import { name as appName } from './app.json';

console.log('✅ Global polyfills initialized (webrtc, getRandomValues, text-encoding)');

AppRegistry.registerComponent(appName, () => App);
