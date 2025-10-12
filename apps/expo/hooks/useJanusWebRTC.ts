/**
 * React Hook for Janus WebRTC Integration
 * 
 * Provides easy-to-use React hook for voice communication
 * through Janus Gateway in the June Voice Platform
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaStream } from 'react-native-webrtc';
import { JanusWebRTCService, JanusCallbacks } from '../lib/JanusWebRTC';

export interface UseJanusWebRTCReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Call state
  isInCall: boolean;
  isCallStarting: boolean;
  callError: string | null;
  
  // Streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  startCall: () => Promise<void>;
  endCall: () => void;
  
  // Service instance (for advanced usage)
  janusService: JanusWebRTCService | null;
}

export interface UseJanusWebRTCOptions {
  autoConnect?: boolean;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for Janus WebRTC functionality
 */
export const useJanusWebRTC = (options: UseJanusWebRTCOptions = {}): UseJanusWebRTCReturn => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  
  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Service instance
  const janusServiceRef = useRef<JanusWebRTCService | null>(null);
  
  /**
   * Initialize Janus service with callbacks
   */
  const initializeService = useCallback(() => {
    const callbacks: JanusCallbacks = {
      onConnected: () => {
        console.log('🟢 Janus connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
      },
      
      onDisconnected: () => {
        console.log('🔴 Janus disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        setIsInCall(false);
        setLocalStream(null);
        setRemoteStream(null);
      },
      
      onError: (error: string) => {
        console.error('❌ Janus error:', error);
        setConnectionError(error);
        setCallError(error);
        setIsConnecting(false);
        setIsCallStarting(false);
        options.onError?.(error);
      },
      
      onLocalStream: (stream: MediaStream) => {
        console.log('🎤 Local stream received');
        setLocalStream(stream);
      },
      
      onRemoteStream: (stream: MediaStream) => {
        console.log('🔊 Remote stream received');
        setRemoteStream(stream);
      },
      
      onCallStarted: () => {
        console.log('📞 Call started');
        setIsInCall(true);
        setIsCallStarting(false);
        setCallError(null);
        options.onCallStarted?.();
      },
      
      onCallEnded: () => {
        console.log('📞 Call ended');
        setIsInCall(false);
        setIsCallStarting(false);
        setLocalStream(null);
        setRemoteStream(null);
        options.onCallEnded?.();
      }
    };
    
    janusServiceRef.current = new JanusWebRTCService(callbacks);
  }, [options]);
  
  /**
   * Connect to Janus Gateway
   */
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) {
      console.log('Already connecting or connected');
      return;
    }
    
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      if (!janusServiceRef.current) {
        initializeService();
      }
      
      const success = await janusServiceRef.current?.connect();
      if (!success) {
        throw new Error('Failed to connect to Janus Gateway');
      }
      
    } catch (error) {
      console.error('Connect error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected, initializeService]);
  
  /**
   * Disconnect from Janus Gateway
   */
  const disconnect = useCallback(() => {
    console.log('Disconnecting from Janus...');
    janusServiceRef.current?.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setIsInCall(false);
    setLocalStream(null);
    setRemoteStream(null);
  }, []);
  
  /**
   * Start a voice call
   */
  const startCall = useCallback(async () => {
    if (!isConnected) {
      setCallError('Not connected to Janus Gateway');
      return;
    }
    
    if (isInCall || isCallStarting) {
      console.log('Already in call or starting call');
      return;
    }
    
    try {
      setIsCallStarting(true);
      setCallError(null);
      
      const success = await janusServiceRef.current?.startVoiceCall();
      if (!success) {
        throw new Error('Failed to start voice call');
      }
      
    } catch (error) {
      console.error('Start call error:', error);
      setCallError(error instanceof Error ? error.message : 'Failed to start call');
      setIsCallStarting(false);
    }
  }, [isConnected, isInCall, isCallStarting]);
  
  /**
   * End the current call
   */
  const endCall = useCallback(() => {
    console.log('Ending call...');
    janusServiceRef.current?.endCall();
  }, []);
  
  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (options.autoConnect) {
      connect();
    }
    
    // Initialize service even if not auto-connecting
    if (!janusServiceRef.current) {
      initializeService();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [options.autoConnect, connect, disconnect, initializeService]);
  
  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Call state
    isInCall,
    isCallStarting,
    callError,
    
    // Streams
    localStream,
    remoteStream,
    
    // Actions
    connect,
    disconnect,
    startCall,
    endCall,
    
    // Service instance
    janusService: janusServiceRef.current
  };
};

/**
 * Hook for simple voice calling (auto-connects)
 */
export const useVoiceCall = (options: Omit<UseJanusWebRTCOptions, 'autoConnect'> = {}) => {
  return useJanusWebRTC({ ...options, autoConnect: true });
};