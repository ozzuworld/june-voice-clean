# Backend Integration Guide

This folder contains the necessary backend changes you need to make to your June orchestrator to support the frontend.

## Required Backend Changes

### 1. Add LiveKit Token Generation Endpoint

Add this to your June orchestrator service (`June/services/june-orchestrator/app/routes/livekit.py`):

```python
# June/services/june-orchestrator/app/routes/livekit.py
"""
LiveKit integration routes for June Platform
"""
import logging
import time
import os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import jwt

logger = logging.getLogger(__name__)
router = APIRouter()

class LiveKitTokenRequest(BaseModel):
    room: str
    participant: str
    permissions: Optional[dict] = None

class LiveKitConfigResponse(BaseModel):
    serverUrl: str
    iceServers: list

@router.post("/token")
async def generate_livekit_token(request: LiveKitTokenRequest):
    """Generate LiveKit access token"""
    try:
        # Get LiveKit credentials from environment
        api_key = os.getenv("LIVEKIT_API_KEY")
        api_secret = os.getenv("LIVEKIT_API_SECRET")
        
        if not api_key or not api_secret:
            raise HTTPException(status_code=500, detail="LiveKit credentials not configured")
        
        # Set default permissions
        permissions = request.permissions or {
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True
        }
        
        # Create JWT payload for LiveKit
        now = int(time.time())
        payload = {
            "iss": api_key,
            "sub": request.participant,
            "aud": "livekit",
            "exp": now + 3600,  # 1 hour expiration
            "nbf": now - 60,    # Not before (60 seconds ago for clock skew)
            "iat": now,         # Issued at
            "name": request.participant,
            "video": {
                "room": request.room,
                "roomJoin": True,
                "canPublish": permissions.get("canPublish", True),
                "canSubscribe": permissions.get("canSubscribe", True),
                "canPublishData": permissions.get("canPublishData", True)
            }
        }
        
        # Generate JWT token
        token = jwt.encode(payload, api_secret, algorithm="HS256")
        
        logger.info(f"Generated LiveKit token for {request.participant} in room {request.room}")
        
        return {"token": token}
        
    except Exception as e:
        logger.error(f"Failed to generate LiveKit token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_livekit_config():
    """Get LiveKit configuration for frontend"""
    return LiveKitConfigResponse(
        serverUrl=os.getenv("LIVEKIT_SERVER_URL", "wss://livekit.allsafe.world"),
        iceServers=[
            {"urls": ["stun:34.59.53.188:3478"]},
            {
                "urls": ["turn:34.59.53.188:3478"],
                "username": os.getenv("TURN_USERNAME", "june-user"),
                "credential": os.getenv("STUNNER_PASSWORD", "Pokemon123!")
            }
        ]
    )
```

### 2. Update Main Routes (`June/services/june-orchestrator/app/main.py`)

Add the LiveKit router:

```python
# Add to imports
from .routes import (
    sessions_router,
    janus_events_router,
    ai_router,
    health_router,
    livekit_router  # Add this
)

# Add to route registration
app.include_router(health_router, tags=["Health"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(janus_events_router, prefix="/api/janus-events", tags=["Janus Events"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI"])
app.include_router(livekit_router, prefix="/api/livekit", tags=["LiveKit"])  # Add this
```

### 3. Update Routes Init (`June/services/june-orchestrator/app/routes/__init__.py`)

```python
from .sessions import router as sessions_router
from .janus_events import router as janus_events_router
from .ai import router as ai_router
from .health import router as health_router
from .livekit import router as livekit_router  # Add this

__all__ = [
    'sessions_router',
    'janus_events_router', 
    'ai_router',
    'health_router',
    'livekit_router'  # Add this
]
```

### 4. Update Requirements (`June/services/june-orchestrator/requirements.txt`)

Add:
```
PyJWT>=2.8.0
```

### 5. Add Environment Variables to Kubernetes

Update your orchestrator deployment to include:

```yaml
# In k8s/complete-manifests.yaml or your orchestrator deployment
env:
  - name: LIVEKIT_API_KEY
    value: "your-livekit-api-key"  # Get this from LiveKit values.yaml
  - name: LIVEKIT_API_SECRET
    value: "your-livekit-api-secret"  # Get this from LiveKit values.yaml
  - name: LIVEKIT_SERVER_URL
    value: "wss://livekit.allsafe.world"
  - name: TURN_USERNAME
    value: "june-user"
  - name: STUNNER_PASSWORD
    value: "Pokemon123!"
```

### 6. Expose LiveKit Through Ingress

Add this to your ingress configuration:

```yaml
# Add to your ingress rules
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

## Testing the Integration

### 1. Test Token Generation

```bash
curl -X POST https://api.allsafe.world/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{
    "room": "test-room",
    "participant": "test-user"
  }'
```

### 2. Test Configuration Endpoint

```bash
curl https://api.allsafe.world/api/livekit/config
```

### 3. Frontend Usage

Once the backend is updated, your frontend will automatically use these endpoints:

```typescript
// In your React Native component
import { JuneVoiceChat } from '../components/JuneVoiceChat';

<JuneVoiceChat
  roomName="my-voice-room"
  participantName="user123"
  onCallStateChanged={(inCall) => console.log('Call state:', inCall)}
  onAiResponse={(response) => console.log('AI:', response)}
  onError={(error) => console.error('Error:', error)}
/>
```

## Architecture Flow

```
Frontend (React Native)
    |
    |─── HTTP/WebSocket ───> June Orchestrator (api.allsafe.world)
    |                           |
    |                           |───> Sessions API
    |                           |───> AI API  
    |                           |───> LiveKit Token API
    |
    |─── WebRTC ───────────> LiveKit Server (livekit.allsafe.world)
                                 |
                                 |───> STUNner (turn:34.59.53.188:3478)
```

## Next Steps

1. **Deploy the backend changes** to your June orchestrator
2. **Test the endpoints** using the curl commands above
3. **Update your frontend app** to use the new `JuneVoiceChat` component
4. **Test end-to-end** voice communication with AI integration

The integration provides:
- ✅ **Secure token generation** on your backend
- ✅ **WebRTC through LiveKit** with your STUNner TURN server
- ✅ **Business logic coordination** through June orchestrator
- ✅ **Real-time AI integration** via WebSocket
- ✅ **Session management** with conversation history
