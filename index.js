// index.js - minimal entry for LiveKit RN per official quickstart
import { registerGlobals } from '@livekit/react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Register LiveKit global WebRTC shims before anything else
registerGlobals();

registerRootComponent(App);
