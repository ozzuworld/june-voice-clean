import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useAudioPlayer } from './useAudioPlayer';
import * as FileSystem from 'expo-file-system';

interface WebSocketMessage {
  type: 'connected' | 'text_response' | 'audio_response' | 'processing_status' | 'error' | 
        'audio_stream_start' | 'audio_stream_complete' | 'processing_complete' | 'voice_transcript' |
        'audio_preference_ack'; // Add acknowledgment type
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
  audio_preferences?: {
    binary_supported: boolean;
    chunked_supported: boolean;
    max_chunk_size?: number;
  };
}

interface AudioStreamState {
  isStreaming: boolean;
  totalChunks: number;
  receivedChunks: number;
  format: string;
  sentChunks: number; // Track sent chunks
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
    format: 'wav',
    sentChunks: 0
  });
  const [audioPreferencesSet, setAudioPreferencesSet] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const binaryChunkBuffer = useRef<Uint8Array[]>([]);
  const audioChunkQueue = useRef<ArrayBuffer[]>([]);
  const isStreamingAudio = useRef(false);

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
      setAudioPreferencesSet(false);
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
      setAudioStreamState(prev => ({ ...prev, isStreaming: false, sentChunks: 0 }));
      setAudioPreferencesSet(false);
      binaryChunkBuffer.current = [];
      audioChunkQueue.current = [];
      isStreamingAudio.current = false;
      console.log('🔌 WebSocket disconnected');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('🔌 WebSocket error:', error);
    };
  }, [accessToken]);

  // Function to send audio chunk via WebSocket
  const sendAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && audioPreferencesSet) {
      console.log('📤 [AUDIO STREAM] Sending audio chunk:', audioData.byteLength, 'bytes');
      
      // Send as binary data
      wsRef.current.send(audioData);
      
      // Update sent chunks count
      setAudioStreamState(prev => ({
        ...prev,
        sentChunks: prev.sentChunks + 1
      }));
      
      return true;
    } else {
      console.log('❌ [AUDIO STREAM] Cannot send - WebSocket not ready or preferences not set');
      console.log('   - WebSocket state:', wsRef.current?.readyState);
      console.log('   - Preferences set:', audioPreferencesSet);
      
      // Queue the chunk for later sending
      audioChunkQueue.current.push(audioData);
      return false;
    }
  }, [audioPreferencesSet]);

  // Function to flush queued audio chunks
  const flushQueuedAudioChunks = useCallback(() => {
    if (audioChunkQueue.current.length > 0 && audioPreferencesSet) {
      console.log('🚀 [AUDIO STREAM] Flushing', audioChunkQueue.current.length, 'queued chunks');
      
      audioChunkQueue.current.forEach(chunk => {
        sendAudioChunk(chunk);
      });
      
      audioChunkQueue.current = [];
    }
  }, [sendAudioChunk, audioPreferencesSet]);

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'connected':
        setSessionId(data.session_id || null);
        console.log('✅ WebSocket session established:', data.session_id);
        
        // Send audio preferences
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('📤 [AUDIO PREF] Sending audio preferences...');
          wsRef.current.send(JSON.stringify({
            type: 'audio_preference',
            prefer_binary: true,
            prefer_chunked: true,
            chunk_size: 4096, // 4KB chunks
            format: 'wav',
            sample_rate: 16000,
            channels: 1,
            timestamp: new Date().toISOString()
          }));
        }
        break;
      
      case 'audio_preference_ack':
        console.log('✅ [AUDIO PREF] Audio preferences acknowledged by server');
        if (data.audio_preferences) {
          console.log('   - Binary supported:', data.audio_preferences.binary_supported);
          console.log('   - Chunked supported:', data.audio_preferences.chunked_supported);
          console.log('   - Max chunk size:', data.audio_preferences.max_chunk_size);
        }
        setAudioPreferencesSet(true);
        
        // Flush any queued audio chunks
        flushQueuedAudioChunks();
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
          format: data.format || 'wav',
          sentChunks: 0
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
        if (data.message?.includes('Unknown message type: audio_preference')) {
          console.log('💡 [AUDIO PREF] Server does not support audio_preference message yet');
          // Set preferences as "acknowledged" anyway to enable streaming
          setAudioPreferencesSet(true);
          flushQueuedAudioChunks();
        }
        break;
        
      default:
        console.log('📨 Unhandled message type:', data.type);
        // If we get an error about unknown message type, handle it gracefully
        if (data.type === undefined && data.message?.includes('audio_preference')) {
          console.log('💡 [AUDIO PREF] Treating as preferences acknowledged due to error message');
          setAudioPreferencesSet(true);
          flushQueuedAudioChunks();
        }
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

  // Send voice message directly to STT service with session correlation
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

  // Start real-time audio streaming
  const startAudioStreaming = useCallback(() => {
    console.log('🎤 [AUDIO STREAM] Starting real-time audio streaming mode');
    isStreamingAudio.current = true;
    setAudioStreamState(prev => ({
      ...prev,
      isStreaming: true,
      sentChunks: 0
    }));
  }, []);

  // Stop real-time audio streaming
  const stopAudioStreaming = useCallback(() => {
    console.log('🛑 [AUDIO STREAM] Stopping real-time audio streaming mode');
    isStreamingAudio.current = false;
    setAudioStreamState(prev => ({
      ...prev,
      isStreaming: false
    }));
    
    // Send end-of-stream marker
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && audioPreferencesSet) {
      wsRef.current.send(JSON.stringify({
        type: 'audio_stream_end',
        timestamp: new Date().toISOString(),
        total_chunks_sent: audioStreamState.sentChunks
      }));
    }
  }, [audioPreferencesSet, audioStreamState.sentChunks]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      binaryChunkBuffer.current = [];
      audioChunkQueue.current = [];
      isStreamingAudio.current = false;
    };
  }, []);

  return {
    isConnected,
    messages,
    isProcessing,
    audioStreamState,
    sessionId,
    audioPreferencesSet,
    isStreamingAudio: isStreamingAudio.current,
    connect,
    sendTextMessage,
    sendVoiceMessage,
    sendAudioChunk, // NEW: Export for real-time streaming
    startAudioStreaming, // NEW: Start streaming mode
    stopAudioStreaming, // NEW: Stop streaming mode
  };
}
