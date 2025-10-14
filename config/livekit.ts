/**
 * LiveKit Configuration for June Voice Platform
 *
 * Finalized client flow:
 * 1) create session with orchestrator → receive LiveKit JWT and livekit_url
 * 2) connect directly to LiveKit with that token
 * 3) optionally open an app-level channel to the orchestrator for AI/UX messages
 *    LiveKit handles all WebRTC; the orchestrator only issues tokens and coordinates AI.
 */

export interface LiveKitConfig {
  serverUrl: string;
  iceServers?: RTCIceServer[];
}

// Production config for ozzu.world
env: {
}
export const livekitConfig: LiveKitConfig = {
  // Orchestrator provides livekit_url at /api/sessions; this is a fallback only
  serverUrl: "wss://livekit.ozzu.world",
  // STUNner TURN/STUN deployed in your cluster
  iceServers: [
    { urls: ["stun:34.59.53.188:3478"] },
    { urls: ["turn:34.59.53.188:3478"], username: "june-user", credential: "Pokemon123!" }
  ]
};

export const devLiveKitConfig: LiveKitConfig = {
  serverUrl: "ws://localhost:7880",
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
};

/**
 * Fetch dynamic LiveKit configuration from orchestrator (optional)
 */
export const fetchLiveKitConfig = async (): Promise<LiveKitConfig> => {
  try {
    const response = await fetch('https://api.ozzu.world/api/livekit/config');
    if (response.ok) {
      const cfg = await response.json();
      return {
        serverUrl: cfg.serverUrl || livekitConfig.serverUrl,
        iceServers: cfg.iceServers || livekitConfig.iceServers,
      };
    }
  } catch (e) {
    console.warn('LiveKit config fetch failed, using fallback', e);
  }
  return livekitConfig;
};

/**
 * Generate LiveKit access token via orchestrator session creation ONLY
 */
export const obtainSessionAndToken = async (
  roomName: string,
  participantName: string
): Promise<{ sessionId: string; accessToken: string; livekitUrl: string; roomName: string; }>
=> {
  const resp = await fetch('https://api.ozzu.world/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: participantName, room_name: roomName })
  });
  if (!resp.ok) throw new Error('Failed to create session');
  const data = await resp.json();
  if (!data.access_token || !data.session_id || !data.livekit_url) {
    throw new Error('Session response missing token or URL');
  }
  return {
    sessionId: data.session_id,
    accessToken: data.access_token,
    livekitUrl: data.livekit_url,
    roomName: data.room_name || roomName,
  };
};

/**
 * Optional: connect to orchestrator app-level channel (if/when available)
 */
export const connectToOrchestrator = async (
  sessionId: string,
  onMessage?: (data: any) => void
): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(`wss://api.ozzu.world/ws/${sessionId}`);
      ws.onopen = () => resolve(ws);
      ws.onmessage = (evt) => { try { onMessage?.(JSON.parse(evt.data)); } catch {} };
      ws.onerror = (err) => reject(err);
    } catch (e) {
      reject(e);
    }
  });
};
