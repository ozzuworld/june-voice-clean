import { registerGlobals } from '@livekit/react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Register the globals before anything else
registerGlobals();

// Register the main application component
registerRootComponent(App);