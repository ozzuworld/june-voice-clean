// index.js - Entry point with LiveKit globals registration

import { registerGlobals } from '@livekit/react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// CRITICAL: Register LiveKit globals before anything else
registerGlobals();

// Register the main App component
registerRootComponent(App);