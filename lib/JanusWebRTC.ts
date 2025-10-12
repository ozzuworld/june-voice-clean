/**
 * Janus WebRTC Service
 * 
 * Handles WebRTC connections to Janus Gateway for voice communication
 * in the June Voice Platform
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream
} from 'react-native-webrtc';
import { getWebRTCConfig, WebRTCConfig } from '../config/webrtc';

export interface JanusMessage {
  janus: string;
  transaction?: string;
  session_id?: number;
  handle_id?: number;
  [key: string]: any;
}

export interface JanusCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
}

export class JanusWebRTCService {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private config: WebRTCConfig;
  private sessionId: number | null = null;
  private handleId: number | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: JanusCallbacks;
  private isConnected = false;
  private transactionCounter = 0;

  constructor(callbacks: JanusCallbacks = {}) {
    this.config = getWebRTCConfig();
    this.callbacks = callbacks;
  }

  /**
   * Connect to Janus Gateway
   */
  async connect(): Promise<boolean> {
    try {
      console.log('Connecting to Janus Gateway at:', this.config.janus.ws_url);
      
      this.ws = new WebSocket(this.config.janus.ws_url, 'janus-protocol');
      
      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('Failed to create WebSocket'));
          return;
        }

        this.ws.onopen = () => {
          console.log('Connected to Janus Gateway');
          this.isConnected = true;
          this.callbacks.onConnected?.();
          this.createSession().then(() => resolve(true)).catch(reject);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as JanusMessage;
            this.handleJanusMessage(message);
          } catch (error) {
            console.error('Failed to parse Janus message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('Janus WebSocket error:', error);
          this.callbacks.onError?.('WebSocket connection failed');
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('Janus WebSocket closed');
          this.isConnected = false;
          this.callbacks.onDisconnected?.();
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });
      
    } catch (error) {
      console.error('Failed to connect to Janus:', error);
      this.callbacks.onError?.('Connection failed');
      return false;
    }
  }

  /**
   * Disconnect from Janus Gateway
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.sessionId = null;
    this.handleId = null;
    this.isConnected = false;
  }

  /**
   * Start a voice call
   */
  async startVoiceCall(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.sessionId) {
        throw new Error('Not connected to Janus');
      }

      // Get microphone permission and stream
      await this.initializeLocalStream();
      
      // Initialize WebRTC PeerConnection
      await this.initializePeerConnection();
      
      // Attach to Janus plugin (assuming AudioBridge plugin)
      await this.attachToPlugin('janus.plugin.audiobridge');
      
      this.callbacks.onCallStarted?.();
      return true;
      
    } catch (error) {
      console.error('Failed to start voice call:', error);
      this.callbacks.onError?.('Failed to start call');
      return false;
    }
  }

  /**
   * End the current call
   */
  endCall(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    this.callbacks.onCallEnded?.();
  }

  /**
   * Get microphone stream
   */
  private async initializeLocalStream(): Promise<void> {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false, // Voice only
      });
      
      this.localStream = stream;
      this.callbacks.onLocalStream?.(stream);
      console.log('Local audio stream initialized');
      
    } catch (error) {
      console.error('Failed to get microphone access:', error);
      throw new Error('Microphone access denied');
    }
  }

  /**
   * Initialize WebRTC PeerConnection
   */
  private async initializePeerConnection(): Promise<void> {
    this.pc = new RTCPeerConnection({
      iceServers: this.config.iceServers
    });

    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.pc?.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidate(event.candidate);
      }
    };

    // Handle remote stream
    this.pc.ontrack = (event) => {
      console.log('Received remote stream');
      if (event.streams && event.streams[0]) {
        this.callbacks.onRemoteStream?.(event.streams[0]);
      }
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', this.pc?.connectionState);
      if (this.pc?.connectionState === 'failed') {
        this.callbacks.onError?.('WebRTC connection failed');
      }
    };
  }

  /**
   * Create Janus session
   */
  private async createSession(): Promise<void> {
    const transaction = this.generateTransactionId();
    const message: JanusMessage = {
      janus: "create",
      transaction
    };
    
    return this.sendMessageAndWait(message, 'success');
  }

  /**
   * Attach to Janus plugin
   */
  private async attachToPlugin(plugin: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    const transaction = this.generateTransactionId();
    const message: JanusMessage = {
      janus: "attach",
      plugin,
      transaction,
      session_id: this.sessionId
    };
    
    return this.sendMessageAndWait(message, 'success');
  }

  /**
   * Send ICE candidate to Janus
   */
  private sendIceCandidate(candidate: RTCIceCandidate): void {
    if (!this.sessionId || !this.handleId) return;

    const message: JanusMessage = {
      janus: "trickle",
      candidate: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex
      },
      transaction: this.generateTransactionId(),
      session_id: this.sessionId,
      handle_id: this.handleId
    };
    
    this.sendMessage(message);
  }

  /**
   * Handle messages from Janus
   */
  private handleJanusMessage(message: JanusMessage): void {
    console.log('Received Janus message:', message.janus);
    
    switch (message.janus) {
      case 'success':
        if (message.data?.id && !this.sessionId) {
          this.sessionId = message.data.id;
          console.log('Janus session created:', this.sessionId);
        } else if (message.data?.id && this.sessionId && !this.handleId) {
          this.handleId = message.data.id;
          console.log('Janus handle attached:', this.handleId);
        }
        break;
        
      case 'webrtcup':
        console.log('WebRTC connection established');
        break;
        
      case 'hangup':
        console.log('Call ended by remote');
        this.endCall();
        break;
        
      case 'error':
        console.error('Janus error:', message.error);
        this.callbacks.onError?.(message.error?.reason || 'Unknown error');
        break;
    }
  }

  /**
   * Send message to Janus
   */
  private sendMessage(message: JanusMessage): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send message and wait for response
   */
  private async sendMessageAndWait(message: JanusMessage, expectedResponse: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const originalOnMessage = this.ws?.onmessage;
      
      const timeoutId = setTimeout(() => {
        if (this.ws) this.ws.onmessage = originalOnMessage;
        reject(new Error('Message timeout'));
      }, 5000);
      
      if (this.ws) {
        this.ws.onmessage = (event) => {
          const response = JSON.parse(event.data) as JanusMessage;
          if (response.transaction === message.transaction && response.janus === expectedResponse) {
            clearTimeout(timeoutId);
            this.ws!.onmessage = originalOnMessage;
            this.handleJanusMessage(response);
            resolve();
          } else {
            // Handle other messages normally
            this.handleJanusMessage(response);
          }
        };
      }
      
      this.sendMessage(message);
    });
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `transaction_${++this.transactionCounter}_${Date.now()}`;
  }

  /**
   * Get connection status
   */
  isConnectedToJanus(): boolean {
    return this.isConnected;
  }
}