// ============================================================================
// FILE 1: apps/expo/hooks/useWebRTC.tsx
// CREATE THIS NEW FILE
// ============================================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import { useAuth } from './useAuth';

interface WebRTCMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'connected' | 'transcript' | 'text_response' | 'error';
  sdp?: string;
  candidate?: any;
  text?: string;
  transcript?: string;
  session_id?: string;
  message?: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
}

export function useWebRTC() {
  const { accessToken } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<any>(null);

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const connect = useCallback(() => {
    if (!accessToken) {
      console.error('❌ No access token');
      setError('Authentication required');
      return;
    }

    const wsUrl = `wss://api.ozzu.world/ws?token=Bearer%20${accessToken}`;
    console.log('🔌 Connecting WebSocket...');

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setError(null);
    };

    wsRef.current.onmessage = async (event) => {
      try {
        const data: WebRTCMessage = JSON.parse(event.data);
        console.log('📨 Message:', data.type);
        await handleSignalingMessage(data);
      } catch (err) {
        console.error('❌ Message error:', err);
      }
    };

    wsRef.current.onerror = (e) => {
      console.error('❌ WebSocket error:', e);
      setError('Connection error');
    };

    wsRef.current.onclose = () => {
      console.log('🔌 WebSocket closed');
      setIsConnected(false);
      setSessionId(null);
      cleanup();
    };
  }, [accessToken]);

  const handleSignalingMessage = async (data: WebRTCMessage) => {
    switch (data.type) {
      case 'connected':
        console.log('✅ Session:', data.session_id);
        setSessionId(data.session_id || null);
        break;

      case 'offer':
        await handleOffer(data.sdp!);
        break;

      case 'answer':
        await handleAnswer(data.sdp!);
        break;

      case 'ice-candidate':
        await handleIceCandidate(data.candidate);
        break;

      case 'transcript':
        if (data.transcript) {
          console.log('🎙️ Transcript:', data.transcript);
          setMessages(prev => [...prev, {
            id: `user-${Date.now()}`,
            text: data.transcript!,
            isUser: true,
            timestamp: new Date(),
            isVoice: true,
          }]);
        }
        break;

      case 'text_response':
        if (data.text) {
          console.log('🤖 Response:', data.text);
          setMessages(prev => [...prev, {
            id: `bot-${Date.now()}`,
            text: data.text!,
            isUser: false,
            timestamp: new Date(),
          }]);
        }
        break;

      case 'error':
        console.error('❌ Server error:', data.message);
        setError(data.message || 'Unknown error');
        break;

      default:
        console.log('📨 Unhandled:', data.type);
    }
  };

  const initPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    console.log('🎬 Init peer connection');
    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🧊 Sending ICE candidate');
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 State:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('✅ WebRTC connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log('❌ WebRTC failed');
        stopStreaming();
      }
    };

    pc.ontrack = (event) => {
      console.log('🎵 Remote track received');
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  const startStreaming = useCallback(async () => {
    try {
      console.log('🎤 Starting streaming...');

      if (!isConnected) {
        throw new Error('Not connected to server');
      }

      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log('✅ Got microphone');
      localStreamRef.current = stream;

      const pc = initPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('📤 Added track');
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);

      console.log('📤 Sending offer');
      wsRef.current?.send(JSON.stringify({
        type: 'offer',
        sdp: offer.sdp,
      }));

      setIsStreaming(true);
      setError(null);
      console.log('✅ Streaming started');

    } catch (err: any) {
      console.error('❌ Start error:', err);
      setError(err.message || 'Failed to start streaming');
      throw err;
    }
  }, [isConnected, initPeerConnection]);

  const stopStreaming = useCallback(() => {
    console.log('🛑 Stopping...');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsStreaming(false);
    console.log('✅ Stopped');
  }, []);

  const handleOffer = async (sdp: string) => {
    const pc = initPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    wsRef.current?.send(JSON.stringify({
      type: 'answer',
      sdp: answer.sdp,
    }));

    console.log('📤 Sent answer');
  };

  const handleAnswer = async (sdp: string) => {
    const pc = peerConnectionRef.current;
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      console.log('✅ Set remote description');
    }
  };

  const handleIceCandidate = async (candidate: any) => {
    const pc = peerConnectionRef.current;
    if (pc && candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('🧊 Added ICE candidate');
    }
  };

  const cleanup = () => {
    stopStreaming();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return {
    isConnected,
    isStreaming,
    messages,
    sessionId,
    error,
    connect,
    startStreaming,
    stopStreaming,
  };
}