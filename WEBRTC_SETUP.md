# June Voice Platform - WebRTC Integration

This React Native app now includes WebRTC integration with your Janus Gateway running on the June Kubernetes platform.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd apps/expo
npm install
```

### 2. Run the App
```bash
# Start Expo development server
npm run start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### 3. Test WebRTC
1. Navigate to the "Voice Test" tab in the app
2. Tap "Connect" to connect to Janus Gateway at `wss://ozzu.world/janus-ws`
3. Once connected, tap "Start Voice Call" to begin audio session
4. Grant microphone permissions when prompted

## 📁 Files Added

### Configuration
- **`config/webrtc.ts`** - WebRTC configuration pointing to your Janus Gateway
- **`lib/JanusWebRTC.ts`** - Core service class for Janus WebRTC communication
- **`hooks/useJanusWebRTC.ts`** - React hook for easy WebRTC integration

### Components
- **`app/(tabs)/voice-test.tsx`** - Demo screen for testing WebRTC functionality

### Dependencies Added
- **`react-native-get-random-values`** - Required for WebRTC crypto functions

## 🔧 Configuration

### Endpoints
Your app connects to:
- **WebSocket**: `wss://ozzu.world/janus-ws` (Janus Gateway)
- **HTTP API**: `https://ozzu.world/janus` (Fallback)
- **STUN/TURN**: `turn.ozzu.world:3478` (STUNner)

### Environment
The configuration automatically uses your production endpoints. To switch to development:

```typescript
// In config/webrtc.ts
export const getWebRTCConfig = (): WebRTCConfig => {
  if (__DEV__) {
    return devWebRTCConfig; // Switch to local development
  }
  return webrtcConfig;
};
```

## 🎯 Usage Examples

### Basic Usage with Hook
```typescript
import { useJanusWebRTC } from '../hooks/useJanusWebRTC';

function VoiceCallComponent() {
  const {
    isConnected,
    isInCall,
    connect,
    startCall,
    endCall
  } = useJanusWebRTC({
    onCallStarted: () => console.log('Call started!'),
    onCallEnded: () => console.log('Call ended!'),
    onError: (error) => console.error('WebRTC error:', error)
  });

  return (
    <View>
      <Button title="Connect" onPress={connect} disabled={isConnected} />
      <Button title="Start Call" onPress={startCall} disabled={!isConnected || isInCall} />
      <Button title="End Call" onPress={endCall} disabled={!isInCall} />
    </View>
  );
}
```

### Auto-Connect Usage
```typescript
// Automatically connects when component mounts
const { isInCall, startCall, endCall } = useVoiceCall({
  onCallStarted: () => Alert.alert('Call Started'),
  onCallEnded: () => Alert.alert('Call Ended')
});
```

### Advanced Usage with Service Class
```typescript
import { JanusWebRTCService } from '../lib/JanusWebRTC';

const janusService = new JanusWebRTCService({
  onConnected: () => console.log('Connected to Janus'),
  onRemoteStream: (stream) => {
    // Handle incoming audio stream
    console.log('Received remote audio stream');
  }
});

// Connect and start call
await janusService.connect();
await janusService.startVoiceCall();
```

## 🔍 Testing

### Connection Test
1. Open the app and go to "Voice Test" tab
2. Check connection status indicator
3. Tap "Connect" and verify it turns green
4. Check logs for connection messages

### Audio Test
1. Ensure connection is established
2. Tap "Start Voice Call"
3. Grant microphone permissions
4. Check that "Local Audio" shows as active
5. Test with another client to verify two-way audio

### Troubleshooting
- **Connection fails**: Check that Janus Gateway is running on `ozzu.world`
- **No audio**: Verify microphone permissions are granted
- **Call doesn't start**: Check STUNner configuration and firewall settings
- **WebRTC errors**: Check browser console for detailed error messages

## 🔗 Integration Points

### With Your Orchestrator
The orchestrator can provide dynamic WebRTC configuration:

```typescript
// Fetch config from your API
const config = await fetch('https://api.ozzu.world/config/webrtc');
```

### With Authentication
Integrate with your Keycloak authentication:

```typescript
// Add auth token to Janus requests
const janusService = new JanusWebRTCService({
  // Pass auth token for authenticated calls
});
```

### With TTS/STT Services
Connect voice calls with your speech services:
- Stream audio from calls to `stt.ozzu.world`
- Stream TTS output from `tts.ozzu.world` to calls

## 📱 Platform Support

### iOS
- Requires microphone permissions in `Info.plist`
- WebRTC works out of the box with Expo

### Android
- Requires `RECORD_AUDIO` permission
- Network Security Config may be needed for development

### Web
- Full WebRTC support in browsers
- HTTPS required for microphone access

## 🚀 Production Deployment

### App Store / Play Store
1. Build production version: `eas build --platform all`
2. Ensure all permissions are properly configured
3. Test on physical devices before release

### Configuration Updates
- Update endpoints in `config/webrtc.ts` for production
- Consider using environment variables for configuration
- Implement proper error handling and fallbacks

Your React Native app is now ready to connect to your Janus Gateway and make voice calls! 🎉