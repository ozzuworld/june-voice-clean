import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useAudioPlayer } from './useAudioPlayer';
import APP_CONFIG from '@/config/app.config';

interface WebSocketMessage {
  type: 'connected' | 'text_response' | 'audio_response' | 'processing_status' | 'error' | 
        'audio_stream_start' | 'audio_stream_complete' | 'audio_chunk';
  text?: string;
  audio_data?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  // Binary streaming properties
  total_chunks?: number;
  total_bytes?: number;
  chunk_size?: number;
  format?: string;
  chunks_sent?: number;
  success?: boolean;
  chunk_data?: string;
  chunk_index?: number;
  is_final?: boolean;
  features?: string[];
}

interface AudioStreamState {
  isStreaming: boolean;
  totalChunks: number;
  receivedChunks: number;
  audioBuffer: ArrayBuffer[];
  format: string;
}

export function useWebSocketChat() {
  const { accessToken, user } = useAuth();
  const { playAudioFromBinary, playAudioFromBase64 } = useAudioPlayer();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioStreamState, setAudioStreamState] = useState<AudioStreamState>({
    isStreaming: false,
    totalChunks: 0,
    receivedChunks: 0,
    audioBuffer: [],
    format: 'wav'
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const binaryChunkBuffer = useRef<Uint8Array[]>([]);

  // Connect to orchestrator WebSocket
  const connect = useCallback(() => {
    if (!accessToken) return;
    
    const wsUrl = `wss://api.ozzu.world/ws?token=Bearer%20${accessToken}`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.binaryType = 'arraybuffer'; // Enable binary message support
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('🔌 WebSocket connected to orchestrator');
      
      // Send audio preferences
      wsRef.current?.send(JSON.stringify({
        type: 'audio_preference',
        prefer_binary: true,
        prefer_chunked: true,
        timestamp: new Date().toISOString()
      }));
    };
    
    wsRef.current.onmessage = (event) => {
      if (typeof event.data === 'string') {
        // Handle JSON text messages
        const data: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } else {
        // Handle binary messages (audio chunks)
        handleBinaryMessage(event.data as ArrayBuffer);
      }
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
      setAudioStreamState(prev => ({ ...prev, isStreaming: false }));
      binaryChunkBuffer.current = [];
      console.log('🔌 WebSocket disconnected');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('🔌 WebSocket error:', error);
    };
  }, [accessToken]);

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    console.log('📨 WebSocket message:', data.type);
    
    switch (data.type) {
      case 'connected':
        console.log('✅ Connected with features:', data.features);
        break;
        
      case 'text_response':
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: data.text,
          isUser: false,
          timestamp: new Date(),
        }]);
        break;
        
      case 'audio_response':
        // Legacy Base64 audio (fallback)
        if (data.audio_data) {
          playAudioFromBase64(data.audio_data);
        }
        break;
        
      case 'audio_stream_start':
        console.log(`🎵 Audio stream starting: ${data.total_chunks} chunks (${data.total_bytes} bytes)`);
        setAudioStreamState({
          isStreaming: true,
          totalChunks: data.total_chunks || 0,
          receivedChunks: 0,
          audioBuffer: [],
          format: data.format || 'wav'
        });
        binaryChunkBuffer.current = [];
        break;
        
      case 'audio_stream_complete':
        console.log(`✅ Audio stream complete: ${data.chunks_sent}/${audioStreamState.totalChunks} chunks`);
        if (data.success && binaryChunkBuffer.current.length > 0) {
          // Combine all binary chunks and play
          const completeAudio = combineAudioChunks(binaryChunkBuffer.current);
          playAudioFromBinary(completeAudio, audioStreamState.format);
        }
        setAudioStreamState(prev => ({ ...prev, isStreaming: false }));
        binaryChunkBuffer.current = [];
        break;
        
      case 'audio_chunk':
        // Legacy Base64 chunks (fallback)
        if (data.chunk_data) {
          // Store chunk for later assembly
          setAudioStreamState(prev => ({
            ...prev,
            receivedChunks: prev.receivedChunks + 1
          }));
        }
        break;
        
      case 'processing_status':
        setIsProcessing(data.status !== 'complete' && data.status !== 'processing_complete');
        break;
        
      case 'error':
        console.error('❌ WebSocket error:', data.message);
        break;
    }
  };

  const handleBinaryMessage = (arrayBuffer: ArrayBuffer) => {
    // Handle binary audio chunks
    const chunk = new Uint8Array(arrayBuffer);
    binaryChunkBuffer.current.push(chunk);
    
    setAudioStreamState(prev => ({
      ...prev,
      receivedChunks: prev.receivedChunks + 1
    }));
    
    console.log(`🎵 Received binary chunk ${binaryChunkBuffer.current.length}/${audioStreamState.totalChunks}`);
    
    // Optional: Start playing audio as soon as we have enough chunks
    if (binaryChunkBuffer.current.length >= 5 && binaryChunkBuffer.current.length === audioStreamState.totalChunks) {
      const completeAudio = combineAudioChunks(binaryChunkBuffer.current);
      playAudioFromBinary(completeAudio, audioStreamState.format);
    }
  };

  const combineAudioChunks = (chunks: Uint8Array[]): ArrayBuffer => {
    // Calculate total size
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    
    // Create combined buffer
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

  // Cleanup on unmount
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
    connect,
    sendTextMessage,
  };
}
