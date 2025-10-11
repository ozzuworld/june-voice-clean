import { useState, useRef, useEffect, useCallback } from 'react';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import { useAuth } from './useAuth';

interface WebRTCMessage {
  type: 'webrtc_offer' | 'webrtc_answer' | 'ice_candidate' | 'connected' | 'transcription_result' | 'text_response' | 'error' | 'audio_stream_start' | 'audio_stream_complete';
  sdp?: string;
  candidate?: any;
  text?: string;
  transcript?: string;
  session_id?: string;
  message?: string;
  ice_servers?: any[];
  features?: string[];
  webrtc_enabled?: boolean;
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

  // Enhanced ICE configuration for internet connections
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
    // Add these ICE transport policies for better connectivity
    iceTransportPolicy: 'all',
    bundlePolicy: 'balanced',
    rtcpMuxPolicy: 'require',
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

    wsRef.current.onerror = (event) => {
      console.error('❌ WebSocket error details:', event);
      setError('WebSocket connection error');
    };

    wsRef.current.onclose = (event) => {
      console.log('🔌 WebSocket closed - Code:', event.code, 'Reason:', event.reason);
      console.log('🔌 Close event details:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
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
        // Use ICE servers from backend if provided
        if (data.ice_servers) {
          rtcConfig.iceServers = data.ice_servers;
          console.log('🧊 Updated ICE servers from backend:', data.ice_servers);
        }
        break;

      case 'webrtc_offer':
        await handleOffer(data.sdp!);
        break;

      case 'webrtc_answer':
        if (data.sdp && peerConnectionRef.current) {
          console.log('📨 Received WebRTC answer from backend');
          try {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription({ type: 'answer', sdp: data.sdp })
            );
            console.log('✅ WebRTC answer processed - connection should establish');
          } catch (error) {
            console.error('❌ Failed to process WebRTC answer:', error);
            setError('Failed to process WebRTC answer');
          }
        }
        break;

      case 'ice_candidate':
        if (data.candidate && peerConnectionRef.current) {
          console.log('📡 Received ICE candidate from backend:', data.candidate);
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('✅ ICE candidate added');
          } catch (error) {
            console.error('❌ Failed to add ICE candidate:', error);
          }
        }
        break;

      case 'transcription_result':
        if (data.text) {
          console.log('🎙️ Transcript:', data.text);
          setMessages(prev => [...prev, {
            id: `user-${Date.now()}`,
            text: data.text!,
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

      case 'audio_stream_start':
        console.log('🎵 Audio stream starting...');
        break;

      case 'audio_stream_complete':
        console.log('🎵 Audio stream complete');
        break;

      default:
        console.log('📨 Unhandled:', data.type);
    }
  };

  const initPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    console.log('🎬 Init peer connection with config:', rtcConfig);
    const pc = new RTCPeerConnection(rtcConfig);

    // Enhanced ICE candidate handling with detailed logging
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate;
        
        console.log('🧊 Frontend ICE Candidate Generated:', {
          type: candidate.type,           // CRITICAL: should include 'srflx'
          protocol: candidate.protocol,   
          address: candidate.address,     // Should show public IP for 'srflx'
          port: candidate.port,          
          priority: candidate.priority,
          sdpMLineIndex: candidate.sdpMLineIndex,
          foundation: candidate.foundation,
          full: candidate.candidate       // Full SDP line
        });
        
        // Check if we're getting server reflexive candidates
        if (candidate.type === 'srflx') {
          console.log('✅ Got server reflexive candidate - public IP discovered!', candidate.address);
        } else if (candidate.type === 'host') {
          console.log('📱 Got host candidate - local IP', candidate.address);
        } else if (candidate.type === 'relay') {
          console.log('🔄 Got relay candidate - TURN server', candidate.address);
        }
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          console.log('🧊 Sending ICE candidate to backend');
          wsRef.current.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate.toJSON(),
          }));
        }
      } else {
        console.log('🏁 ICE gathering completed - no more candidates');
      }
    };

    // ICE gathering state monitoring
    pc.onicegatheringstatechange = () => {
      console.log('🧊 ICE Gathering State:', pc.iceGatheringState);
    };

    // ICE connection state monitoring
    pc.oniceconnectionstatechange = () => {
      console.log('🔌 ICE Connection State:', pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('✅ ICE Connection established - audio should flow now');
        setError(null);
      } else if (pc.iceConnectionState === 'failed') {
        console.error('❌ ICE Connection failed:', pc.iceConnectionState);
        console.error('🔍 This usually means:');
        console.error('  1. No server reflexive (srflx) candidates were generated');
        console.error('  2. STUN servers are not accessible');
        console.error('  3. Network firewall is blocking WebRTC traffic');
        console.error('  4. NAT type is too restrictive (may need TURN server)');
        setError('Connection failed - NAT traversal issue');
      } else if (pc.iceConnectionState === 'disconnected') {
        console.log('🔌 ICE Connection disconnected');
        setError('Connection lost');
      } else if (pc.iceConnectionState === 'checking') {
        console.log('🔍 ICE Connection checking...');
        setError(null);
      }
    };

    // Overall connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection State:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        console.log('✅ Peer connection established successfully');
        setError(null);
      } else if (pc.connectionState === 'failed') {
        console.error('❌ Peer connection failed');
        setError('Peer connection failed');
        stopStreaming();
      } else if (pc.connectionState === 'disconnected') {
        console.log('🔌 Peer connection disconnected');
      }
    };

    pc.ontrack = (event) => {
      console.log('🎵 Remote track received from backend');
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
          sampleRate: 48000, // Match backend expectations
        },
        video: false,
      });

      console.log('✅ Got microphone');
      
      // Log audio stream details for debugging
      console.log('🎤 Audio stream tracks:', stream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted,
        id: track.id
      })));

      localStreamRef.current = stream;

      const pc = initPeerConnection();

      stream.getTracks().forEach(track => {
        console.log('📤 Adding track to peer connection:', {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        });
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);

      console.log('📤 Sending WebRTC offer');
      console.log('🔍 ICE gathering will start now - watch for ICE candidates...');
      
      wsRef.current?.send(JSON.stringify({
        type: 'webrtc_offer',
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
      localStreamRef.current.getTracks().forEach((track: any) => {
        console.log('🛑 Stopping track:', track.kind);
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      console.log('🛑 Closing peer connection');
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
      type: 'webrtc_answer',
      sdp: answer.sdp,
    }));

    console.log('📤 Sent WebRTC answer');
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
