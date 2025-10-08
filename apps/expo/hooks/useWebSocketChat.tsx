import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import APP_CONFIG from '@/config/app.config';

interface WebSocketMessage {
  type: 'connected' | 'text_response' | 'audio_response' | 'processing_status' | 'error';
  text?: string;
  audio_data?: string;
  status?: string;
  message?: string;
  timestamp?: string;
}

export function useWebSocketChat() {
  const { accessToken, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to orchestrator WebSocket
  const connect = useCallback(() => {
    if (!accessToken) return;
    
    const wsUrl = `wss://api.ozzu.world/ws?token=Bearer%20${accessToken}`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('🔌 WebSocket connected to orchestrator');
    };
    
    wsRef.current.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('🔌 WebSocket disconnected');
    };
  }, [accessToken]);

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'text_response':
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: data.text,
          isUser: false,
          timestamp: new Date(),
        }]);
        break;
      case 'audio_response':
        // Play audio response
        playAudioResponse(data.audio_data);
        break;
      case 'processing_status':
        setIsProcessing(data.status !== 'complete');
        break;
    }
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

  return {
    isConnected,
    messages,
    isProcessing,
    connect,
    sendTextMessage,
  };
}
