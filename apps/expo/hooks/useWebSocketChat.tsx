import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useAudioPlayer } from './useAudioPlayer';
import * as FileSystem from 'expo-file-system';

interface WebSocketMessage {
  type: 'connected' | 'text_response' | 'audio_response' | 'processing_status' | 'error' | 
        'audio_stream_start' | 'audio_stream_complete' | 'processing_complete' | 'voice_transcript';
  text?: string;
  audio_data?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  transcript?: string;
  session_id?: string;
  user_id?: string;
  authenticated?: boolean;
  version?: string;
  features?: string[];
  total_chunks?: number;
  total_bytes?: number;
  chunk_size?: number;
  format?: string;
  chunks_sent?: number;
  success?: boolean;
}

interface AudioStreamState {
  isStreaming: boolean;
  totalChunks: number;
  receivedChunks: number;
  format: string;
}

export function useWebSocketChat() {
  const { accessToken } = useAuth();
  const { playAudioFromBinary } = useAudioPlayer();
  
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [audioStreamState, setAudioStreamState] = useState<AudioStreamState>({
    isStreaming: false,
    totalChunks: 0,
    receivedChunks: 0,
    format: 'wav'
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const binaryChunkBuffer = useRef<Uint8Array[]>([]);

  const connect = useCallback(() => {
    if (!accessToken) {
      console.log('❌ No access token available');
      return;
    }
    
    const wsUrl = `wss://api.ozzu.world/ws?token=Bearer%20${accessToken}`;
    console.log('🔌 Connecting WebSocket...');
    
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.binaryType = 'arraybuffer';
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('✅ WebSocket connected');
    };
    
    wsRef.current.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data.type);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ JSON parse error:', error);
        }
      } else if (event.data instanceof ArrayBuffer) {
        console.log('🎵 Received binary chunk:', event.data.byteLength, 'bytes');
        handleBinaryMessage(event.data);
      }
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
      setSessionId(null);
      setAudioStreamState(prev => ({ ...prev, isStreaming: false }));
      binaryChunkBuffer.current = [];
      console.log('🔌 WebSocket disconnected');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('🔌 WebSocket error:', error);
    };
  }, [accessToken]);

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'connected':
        setSessionId(data.session_id || null);
        console.log('✅ WebSocket session established:', data.session_id);
        
        // Send audio preferences
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'audio_preference',
            prefer_binary: true,
            prefer_chunked: true,
            timestamp: new Date().toISOString()
          }));
        }
        break;
        
      case 'text_response':
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: data.text,
          isUser: false,
          timestamp: new Date(),
        }]);
        break;
        
      case 'voice_transcript':
        console.log('🎙️ Voice transcript received:', data.transcript);
        if (data.transcript) {
          setMessages(prev => [...prev, {
            id: `user-voice-${Date.now()}`,
            text: data.transcript,
            isUser: true,
            timestamp: new Date(),
            isVoice: true
          }]);
        }
        break;
        
      case 'audio_stream_start':
        console.log(`🎵 Audio stream starting: ${data.total_chunks} chunks (${data.total_bytes} bytes)`);
        setAudioStreamState({
          isStreaming: true,
          totalChunks: data.total_chunks || 0,
          receivedChunks: 0,
          format: data.format || 'wav'
        });
        binaryChunkBuffer.current = [];
        break;
        
      case 'audio_stream_complete':
        console.log(`✅ Audio stream complete: ${data.chunks_sent}/${audioStreamState.totalChunks} chunks`);
        if (data.success && binaryChunkBuffer.current.length > 0) {
          const completeAudio = combineAudioChunks(binaryChunkBuffer.current);
          console.log('🔊 Playing combined audio:', completeAudio.byteLength, 'bytes');
          playAudioFromBinary(completeAudio, audioStreamState.format);
        }
        setAudioStreamState(prev => ({ ...prev, isStreaming: false }));
        binaryChunkBuffer.current = [];
        break;
        
      case 'processing_status':
        const isStillProcessing = data.status !== 'complete' && data.status !== 'processing_complete';
        setIsProcessing(isStillProcessing);
        console.log('⏳ Processing status:', data.status, data.message);
        break;
        
      case 'processing_complete':
        setIsProcessing(false);
        break;
        
      case 'error':
        console.error('❌ WebSocket error:', data.message);
        break;
        
      default:
        console.log('📨 Unhandled message type:', data.type);
    }
  };

  const handleBinaryMessage = (arrayBuffer: ArrayBuffer) => {
    const chunk = new Uint8Array(arrayBuffer);
    binaryChunkBuffer.current.push(chunk);
    
    setAudioStreamState(prev => ({
      ...prev,
      receivedChunks: prev.receivedChunks + 1
    }));
    
    console.log(`🎵 Binary chunk ${binaryChunkBuffer.current.length}/${audioStreamState.totalChunks}`);
  };

  const combineAudioChunks = (chunks: Uint8Array[]): ArrayBuffer => {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedArray = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const chunk of chunks) {
      combinedArray.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combinedArray.buffer;
  };

  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || !isConnected) return;
    
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      text,
      isUser: true,
      timestamp: new Date(),
    }]);
    
    wsRef.current.send(JSON.stringify({
      type: 'text_input',
      text,
      timestamp: new Date().toISOString(),
    }));
  }, [isConnected]);

  // NEW: Send voice message directly to STT service with session correlation
  const sendVoiceMessage = useCallback(async (audioUri: string) => {
    if (!sessionId || !isConnected) {
      console.error('❌ No session ID or not connected');
      return;
    }

    try {
      console.log('🎙️ Processing voice message:', audioUri);
      setIsProcessing(true);
      
      // Read audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send directly to STT service with session correlation
      const response = await fetch('https://api.ozzu.world/stt/v1/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          audio_data: audioBase64,
          format: 'mp4', // or 'wav' depending on your recording format
          language: 'en',
          session_id: sessionId, // KEY: Include session ID for correlation
          webhook_url: `https://api.ozzu.world/orchestrator/v1/stt/webhook`,
        }),
      });

      if (response.ok) {
        console.log('✅ Voice message sent for STT processing');
      } else {
        console.error('❌ STT request failed:', response.status);
        setIsProcessing(false);
      }
      
    } catch (error) {
      console.error('❌ Failed to send voice message:', error);
      setIsProcessing(false);
    }
  }, [sessionId, isConnected, accessToken]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      binaryChunkBuffer.current = [];
    };
  }, []);

  return {
    isConnected,
    messages,
    isProcessing,
    audioStreamState,
    sessionId,
    connect,
    sendTextMessage,
    sendVoiceMessage, // NEW: Export voice message sender
  };
}
