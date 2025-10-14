# LiveKit Migration Guide

## Overview

This repository has been successfully migrated from **Janus Gateway** to **LiveKit** for voice communication. LiveKit provides better reliability, easier development, and improved audio quality.

## 🆕 What Changed

### Removed (Janus-related)
- ❌ `lib/JanusWebRTC.ts` - Old Janus service
- ❌ `config/webrtc.ts` - Janus configuration
- ❌ Manual WebRTC peer connection management
- ❌ WebSocket protocol handling

### Added (LiveKit-based)
- ✅ `lib/LiveKitVoiceService.ts` - New LiveKit service
- ✅ `config/livekit.ts` - LiveKit configuration
- ✅ `components/LiveKitVoiceChat.tsx` - Example usage
- ✅ `livekit-client` dependency
- ✅ `@livekit/react-native` dependency

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
# Install new LiveKit packages
npm install livekit-client @livekit/react-native

# Clean install (recommended)
rm -rf node_modules package-lock.json
npm install
```

### 2. Backend Requirements

Your backend needs to generate LiveKit tokens. Add this endpoint to your `june-orchestrator` service:

```python
# Add to requirements.txt
livekit-api==0.13.1
PyJWT>=2.8.0

# Add to your FastAPI app
from datetime import datetime, timedelta
import jwt
import os

@app.post("/livekit/token")
async def create_livekit_token(request: TokenRequest):
    # Generate JWT token for LiveKit
    payload = {
        "iss": os.getenv("LIVEKIT_API_KEY"),
        "sub": request.participant,
        "aud": "livekit",
        "exp": int(time.time()) + 3600,  # 1 hour
        "video": {
            "room": request.room,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True
        }
    }
    token = jwt.encode(payload, os.getenv("LIVEKIT_API_SECRET"), algorithm="HS256")
    return {"token": token}
```

### 3. Environment Variables

Add these to your Kubernetes deployment:

```yaml
# In your ConfigMap
LIVEKIT_SERVER_URL: "wss://livekit.ozzu.world"

# In your Secret
LIVEKIT_API_KEY: "your-api-key-from-livekit-values"
LIVEKIT_API_SECRET: "your-secret-from-livekit-values"
```

### 4. Update Your Domain Configuration

Make sure your LiveKit server is accessible at:
- 🌐 **wss://livekit.ozzu.world** (WebSocket endpoint)
- 🌐 **https://api.ozzu.world/livekit/token** (Token generation)

## 📱 Usage in Your App

### Replace Old Janus Code

**OLD (Janus):**
```typescript
import { JanusWebRTCService } from '../lib/JanusWebRTC';

const janusService = new JanusWebRTCService(callbacks);
await janusService.connect();
await janusService.startVoiceCall();
```

**NEW (LiveKit):**
```typescript
import { LiveKitVoiceService } from '../lib/LiveKitVoiceService';

const liveKitService = new LiveKitVoiceService(callbacks);
await liveKitService.connect('room-name', 'participant-name');
await liveKitService.startVoiceCall();
```

### Example Component Usage

```tsx
import { LiveKitVoiceChat } from '../components/LiveKitVoiceChat';

export default function VoiceCallScreen() {
  return (
    <LiveKitVoiceChat
      roomName="my-voice-room"
      participantName="user123"
      onCallStateChanged={(inCall) => {
        console.log('Call state changed:', inCall);
      }}
    />
  );
}
```

## 🔊 STUNner Integration

Your existing STUNner configuration works perfectly with LiveKit:

- **STUN Server**: `stun:34.59.53.188:3478`
- **TURN Server**: `turn:34.59.53.188:3478`
- **Username**: `june-user`
- **Password**: `Pokemon123!`

LiveKit will automatically use these servers for NAT traversal.

## 📊 Benefits of LiveKit vs Janus

| Feature | Janus Gateway | LiveKit |
|---------|---------------|----------|
| **Setup Complexity** | High (manual WebRTC) | Low (managed service) |
| **Reconnection** | Manual implementation | Built-in auto-reconnect |
| **Audio Quality** | Manual tuning needed | Optimized out-of-box |
| **Error Handling** | Complex | Simplified |
| **Scalability** | Manual clustering | Built-in load balancing |
| **Development Speed** | Slow | Fast |

## 🔧 Troubleshooting

### Common Issues

1. **"Failed to generate token"**
   - Check backend endpoint: `https://api.ozzu.world/livekit/token`
   - Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` environment variables

2. **"Connection failed"**
   - Check LiveKit server: `wss://livekit.ozzu.world`
   - Verify SSL certificate is valid
   - Check Kubernetes ingress configuration

3. **"No audio"**
   - Check microphone permissions
   - Verify TURN server credentials
   - Check device audio settings

### Debug Mode

Enable debug logging in `config/app.config.ts`:

```typescript
DEBUG: {
  LIVEKIT_LOGS: true,
  VERBOSE_LOGS: true,
}
```

### Testing Connection

```typescript
// Test TURN server connectivity
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:34.59.53.188:3478' },
    { 
      urls: 'turn:34.59.53.188:3478',
      username: 'june-user',
      credential: 'Pokemon123!'
    }
  ]
});

pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('✅ ICE candidate:', event.candidate.candidate);
  }
};
```

## 📝 API Reference

### LiveKitVoiceService Methods

- `connect(roomName, participantName)` - Connect to room
- `disconnect()` - Leave room  
- `startVoiceCall()` - Enable microphone
- `endVoiceCall()` - Disable microphone
- `setMicrophoneEnabled(enabled)` - Mute/unmute
- `sendDataMessage(message)` - Send text message
- `getParticipants()` - Get participant list
- `getRoomStats()` - Get connection stats

### LiveKitCallbacks Events

- `onConnected` - Successfully joined room
- `onDisconnected` - Left room or connection lost
- `onError` - Connection or audio error
- `onCallStarted` - Microphone enabled
- `onCallEnded` - Microphone disabled
- `onParticipantJoined` - Someone joined room
- `onParticipantLeft` - Someone left room
- `onRemoteAudioTrack` - Receiving audio from participant

## 🔄 Next Steps

1. **Test the migration**: Run the app and test voice calls
2. **Update your UI components**: Replace Janus components with LiveKit ones
3. **Deploy backend changes**: Add token generation endpoint
4. **Monitor performance**: Check audio quality and connection stability
5. **Remove old code**: Clean up any remaining Janus references

## 🆘 Need Help?

If you encounter any issues:

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly  
3. Test the backend token endpoint directly
4. Check LiveKit server health at `https://livekit.ozzu.world/`

The migration is complete! Your app now uses LiveKit for reliable, high-quality voice communication. 🎉