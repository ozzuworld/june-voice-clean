// index.js - Entry point with LiveKit globals registration and Hermes polyfills

import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';
import { Buffer } from 'buffer';
import { registerGlobals } from '@livekit/react-native';
import { registerRootComponent } from 'expo';
import App from './App';
import { setLogLevel, LogLevel } from 'livekit-client';

// Polyfill TextEncoder/TextDecoder for Hermes
if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}

// Polyfill Buffer if missing
if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

// Polyfill atob/btoa for Hermes (base64 helpers some libs rely on)
if (typeof global.atob === 'undefined') {
  // @ts-ignore
  global.atob = (data) => Buffer.from(String(data), 'base64').toString('binary');
}
if (typeof global.btoa === 'undefined') {
  // @ts-ignore
  global.btoa = (data) => Buffer.from(String(data), 'binary').toString('base64');
}

// Enable verbose LiveKit client logs for debugging
setLogLevel(LogLevel.debug);

// CRITICAL: Register LiveKit globals before anything else
registerGlobals();

// Register the main App component
registerRootComponent(App);