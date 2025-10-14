# June Frontend Integration Summary

## 🎉 What Was Updated

Your frontend has been successfully configured to connect to your June backend with the correct TURN/STUN server configuration.

### 🔄 Files Modified

1. **`config/livekit.ts`** - Updated LiveKit configuration
   - Changed serverUrl to `wss://livekit.allsafe.world`
   - Updated TURN/STUN server to your IP: `turn:34.59.53.188:3478`
   - Added orchestrator integration functions

2. **`config/api.ts`** - New June API configuration
   - June orchestrator URL: `https://api.allsafe.world`
   - Keycloak IDP URL: `https://idp.allsafe.world`
   - Complete API client for backend communication

3. **`lib/LiveKitVoiceService.ts`** - Enhanced service integration
   - Integrated with June orchestrator API
   - Added session management
   - WebSocket connection to orchestrator
   - AI message handling

4. **`components/JuneVoiceChat.tsx`** - Complete integration example
   - Shows how to use the updated service
   - Handles all connection states
   - Demonstrates AI integration
   - Real-time participant management

5. **`backend-integration/README.md`** - Backend changes needed
   - LiveKit token generation endpoint
   - Environment variables setup
   - Ingress configuration

## 🎯 Connection Architecture

Your frontend now follows this architecture:

```
React Native App
│
├── HTTP/WebSocket ───> June Orchestrator (api.allsafe.world)
│                        ├──> Session Management
│                        ├──> AI Coordination  
│                        └──> Token Generation
│
└── WebRTC ────────────> LiveKit (livekit.allsafe.world)
                          └──> STUNner TURN (34.59.53.188:3478)
```

## 🔑 Key Configuration Updates

### TURN/STUN Server
- **Server**: `turn:34.59.53.188:3478`
- **Username**: `june-user`
- **Password**: `Pokemon123!`

### API Endpoints
- **Orchestrator**: `https://api.allsafe.world`
- **LiveKit**: `wss://livekit.allsafe.world`
- **Identity Provider**: `https://idp.allsafe.world`

## 🚀 How to Use

### 1. In Your App Component

```typescript
import { JuneVoiceChat } from '../components/JuneVoiceChat';

export default function VoiceScreen() {
  return (
    <JuneVoiceChat
      roomName="my-conversation"
      participantName="user123"
      onCallStateChanged={(inCall) => console.log('In call:', inCall)}
      onAiResponse={(response) => console.log('AI said:', response)}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

### 2. Direct Service Usage

```typescript
import { LiveKitVoiceService } from '../lib/LiveKitVoiceService';

const voiceService = new LiveKitVoiceService({
  onConnected: () => console.log('Connected to June platform'),
  onError: (error) => console.error('Error:', error),
  onAiResponse: (response) => console.log('AI response:', response)
});

// Connect to June platform
await voiceService.connect('room-name', 'participant-name');

// Start voice call
await voiceService.startVoiceCall();

// Send AI message
const response = await voiceService.sendAiMessage('Hello AI!');
```

## ⚠️ Backend Requirements

**Important**: You need to add LiveKit token generation to your June orchestrator. See `backend-integration/README.md` for detailed instructions.

### Quick Backend Setup

1. **Add new endpoint** to your orchestrator:
   ```python
   # June/services/june-orchestrator/app/routes/livekit.py
   @router.post("/token")
   async def generate_livekit_token(request: LiveKitTokenRequest):
       # JWT token generation code (see backend-integration/README.md)
   ```

2. **Add environment variables**:
   ```yaml
   env:
     - name: LIVEKIT_API_KEY
       value: "your-api-key"
     - name: LIVEKIT_API_SECRET
       value: "your-secret"
     - name: LIVEKIT_SERVER_URL
       value: "wss://livekit.allsafe.world"
   ```

3. **Expose LiveKit through ingress**:
   ```yaml
   - host: livekit.allsafe.world
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: livekit
             port:
               number: 80
   ```

## 📝 Features Enabled

✅ **WebRTC Voice Communication** via LiveKit  
✅ **TURN/STUN Server Integration** (34.59.53.188:3478)  
✅ **June Orchestrator Connection** for business logic  
✅ **Session Management** with conversation history  
✅ **AI Integration** through orchestrator API  
✅ **Real-time Messaging** via WebSocket  
✅ **Participant Management** and presence  
✅ **Audio Controls** (mute, unmute, call start/end)  
✅ **Connection State Management** with error handling  
✅ **Authentication Support** (Keycloak ready)  

## 🔍 Testing the Integration

### 1. Test Backend Connectivity
```bash
# Test orchestrator health
curl https://api.allsafe.world/healthz

# Test token generation (after backend update)
curl -X POST https://api.allsafe.world/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"room": "test", "participant": "user"}'
```

### 2. Test Frontend
```bash
# Install dependencies
npm install

# Start the app
npm start
```

### 3. Test Voice Call Flow
1. **Connect** to June platform → Creates session + connects to LiveKit
2. **Start Call** → Enables microphone + publishes audio track
3. **Send AI Message** → Communicates with orchestrator
4. **End Call** → Stops audio + cleans up
5. **Disconnect** → Closes all connections

## 🚫 Common Issues & Solutions

### “Failed to generate token”
- ❌ Backend missing LiveKit token endpoint
- ✅ Add the endpoint from `backend-integration/README.md`

### “Connection failed”
- ❌ LiveKit not accessible at `livekit.allsafe.world`
- ✅ Add ingress rule for LiveKit service

### “TURN server not working”
- ❌ STUNner not running or misconfigured
- ✅ Check STUNner gateway: `kubectl get gateway -n stunner`

### “Microphone permission denied”
- ❌ App lacks microphone permissions
- ✅ Check device settings and app permissions

## 🏁 Next Steps

1. **🛠️ Implement backend changes** from `backend-integration/README.md`
2. **🗺️ Update DNS** to point `livekit.allsafe.world` to your server
3. **🧪 Test the integration** using the `JuneVoiceChat` component
4. **🎆 Deploy to production** and test with real users
5. **📊 Monitor performance** and connection quality

---

**🎉 Your frontend is now ready to connect to your June backend with WebRTC voice communication!**

The integration provides a complete voice AI platform with:
- Real-time voice communication via WebRTC
- AI conversation handling through your orchestrator
- Reliable NAT traversal through STUNner
- Professional connection state management
- Full session lifecycle management