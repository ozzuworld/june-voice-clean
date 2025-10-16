// index.js - minimal entry with essential Hermes polyfills for LiveKit
import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';
import { registerGlobals } from '@livekit/react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Essential polyfills for Hermes
if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}

// Register LiveKit global WebRTC shims before anything else
registerGlobals();

registerRootComponent(App);
