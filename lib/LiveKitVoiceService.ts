/**
 * LiveKit Voice Service
 * 
 * Handles voice communication using LiveKit for the June Voice Platform
 * Updated to integrate with June orchestrator backend
 */

import {
  Room,
  RoomEvent,
  LocalTrack,
  LocalAudioTrack,
  RemoteTrack,
  RemoteAudioTrack,
  Track,
  AudioCaptureOptions,
  RoomOptions,
  ConnectOptions,
  DataPacket_Kind,
  RoomState,
  ConnectionQuality,
  RemoteParticipant
} from 'livekit-client';

import { getLiveKitConfig, generateAccessToken, LiveKitConfig } from '../config/livekit';
import { JuneApiClient, getJuneApiConfig } from '../config/api';
import { requestMicrophonePermission } from '../utils/permissions';

export interface LiveKitCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  onRemoteAudioTrack?: (track: RemoteAudioTrack, participant: RemoteParticipant) => void;
  onLocalAudioTrack?: (track: LocalAudioTrack) => void;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  onParticipantJoined?: (participant: RemoteParticipant) => void;
  onParticipantLeft?: (participant: RemoteParticipant) => void;
  onDataReceived?: (payload: Uint8Array, participant: RemoteParticipant) => void;
  onConnectionQualityChanged?: (quality: ConnectionQuality, participant: RemoteParticipant) => void;
  onOrchestratorMessage?: (data: any) => void;
}

export class LiveKitVoiceService {
  private room: Room | null = null;
  private config: LiveKitConfig;
  private callbacks: LiveKitCallbacks;
  private localAudioTrack: LocalAudioTrack | null = null;
  private isConnected = false;
  private currentRoomName: string | null = null;
  private juneApi: JuneApiClient;
  private orchestratorWs: WebSocket | null = null;
  private sessionId: string | null = null;

  constructor(callbacks: LiveKitCallbacks = {}) {
    this.config = getLiveKitConfig();
    this.callbacks = callbacks;
    this.juneApi = new JuneApiClient();
  }

  /**
   * Set authentication token for June API calls
   */
  setAuthToken(token: string): void {
    this.juneApi.setAuthToken(token);
  }

  /**
   * Connect to June platform (orchestrator + LiveKit)
   */
  async connect(roomName: string, participantName: string): Promise<boolean> {
    try {
      console.log('🚀 Connecting to June platform...'); 
      
      // Step 1: Create session with June orchestrator
      console.log('📋 Creating session with June orchestrator...');
      const session = await this.juneApi.createSession(participantName, roomName);
      this.sessionId = session.session_id;
      console.log('✅ Session created:', this.sessionId);
      
      // Step 2: Connect to orchestrator WebSocket for real-time coordination
      console.log('🔗 Connecting to orchestrator WebSocket...');
      this.orchestratorWs = await this.juneApi.connectWebSocket(
        this.sessionId,
        (data) => this.callbacks.onOrchestratorMessage?.(data)
      );
      
      // Step 3: Connect to LiveKit room for voice communication
      console.log('🔗 Connecting to LiveKit room:', roomName);
      
      // Initialize room
      this.room = new Room();
      this.currentRoomName = roomName;
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Generate access token
      console.log('🎫 Generating LiveKit access token...');
      const token = await generateAccessToken(roomName, participantName);
      
      // Configure room options with your TURN/STUN server
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        
        // Audio settings optimized for voice AI
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as AudioCaptureOptions,
        
        disconnectOnPageLeave: true,
      };

      // Connect options with your STUNner TURN/STUN server
      const connectOptions: ConnectOptions = {
        autoSubscribe: true,
        rtcConfig: {
          iceServers: this.config.iceServers, // Uses your turn:34.59.53.188:3478
          iceCandidatePoolSize: 10,
        },
      };
      
      // Connect to LiveKit
      console.log('📡 Connecting to LiveKit server:', this.config.serverUrl);
      await this.room.connect(this.config.serverUrl, token, connectOptions);
      
      this.isConnected = true;
      console.log('✅ Successfully connected to June platform');
      this.callbacks.onConnected?.();
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to connect to June platform:', error);
      await this.cleanup();
      
      let errorMessage = 'Failed to connect to June platform';
      
      if (error instanceof Error) {
        if (error.message.includes('token')) {
          errorMessage = 'Authentication failed. Please check your credentials.';
        } else if (error.message.includes('session')) {
          errorMessage = 'Failed to create session. Please check your backend connection.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network connection failed. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.callbacks.onError?.(errorMessage);
      return false;
    }
  }

  /**
   * Disconnect from the June platform
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from June platform...');
    
    await this.cleanup();
    
    // Delete session from orchestrator
    if (this.sessionId) {
      try {
        await this.juneApi.deleteSession(this.sessionId);
        console.log('🗑️ Session deleted:', this.sessionId);
      } catch (error) {
        console.warn('Failed to delete session:', error);
      }
      this.sessionId = null;
    }
    
    this.callbacks.onDisconnected?.();
  }

  /**
   * Clean up connections
   */
  private async cleanup(): Promise<void> {
    // Stop audio track
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
    
    // Disconnect from LiveKit
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    
    // Close orchestrator WebSocket
    if (this.orchestratorWs) {
      this.orchestratorWs.close();
      this.orchestratorWs = null;
    }
    
    this.isConnected = false;
    this.currentRoomName = null;
  }

  /**
   * Start voice call (enable microphone)
   */
  async startVoiceCall(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.room) {
        throw new Error('Not connected to June platform');
      }

      console.log('🎤 Starting voice call...');
      
      // Check microphone permission
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Microphone permission denied. Please grant microphone access in your device settings.');
      }

      // Create and publish local audio track
      console.log('📹 Creating local audio track...');
      this.localAudioTrack = await LocalTrack.createAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } as AudioCaptureOptions);

      // Publish the track
      console.log('📤 Publishing audio track...');
      await this.room.localParticipant.publishTrack(this.localAudioTrack, {
        name: 'microphone',
        source: Track.Source.Microphone,
      });
      
      this.callbacks.onLocalAudioTrack?.(this.localAudioTrack);
      this.callbacks.onCallStarted?.();
      
      console.log('✅ Voice call started successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start voice call:', error);
      
      let errorMessage = 'Failed to start voice call';
      if (error instanceof Error) {
        if (error.name === 'SecurityError' || error.name === 'NotAllowedError') {
          errorMessage = 'Microphone permission denied. Please grant microphone access.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Microphone is being used by another application.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.callbacks.onError?.(errorMessage);
      return false;
    }
  }

  /**
   * End voice call (disable microphone)
   */
  async endVoiceCall(): Promise<void> {
    console.log('📴 Ending voice call...');
    
    if (this.localAudioTrack && this.room) {
      await this.room.localParticipant.unpublishTrack(this.localAudioTrack);
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
    
    this.callbacks.onCallEnded?.();
  }

  /**
   * Mute/unmute microphone
   */
  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(enabled);
      console.log(enabled ? '🎤 Microphone enabled' : '🔇 Microphone muted');
    }
  }

  /**
   * Send message to June AI through orchestrator
   */
  async sendAiMessage(message: string): Promise<any> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }
    
    return await this.juneApi.sendAiMessage(message, this.sessionId);
  }

  /**
   * Send data message to LiveKit participants
   */
  async sendDataMessage(message: string): Promise<void> {
    if (this.room && this.isConnected) {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      
      await this.room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      console.log('📤 Data message sent to LiveKit:', message);
    }
  }

  /**
   * Get conversation history from orchestrator
   */
  async getConversationHistory(): Promise<any> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }
    
    return await this.juneApi.getConversationHistory(this.sessionId);
  }

  /**
   * Get current platform statistics
   */
  getPlatformStats(): any {
    return {
      // LiveKit stats
      livekit: {
        participants: this.room?.numParticipants || 0,
        isConnected: this.isConnected,
        roomName: this.currentRoomName,
        connectionState: this.room?.state,
        localParticipant: this.room?.localParticipant.identity,
      },
      // June platform stats
      june: {
        sessionId: this.sessionId,
        orchestratorConnected: this.orchestratorWs?.readyState === WebSocket.OPEN,
        backendHealthy: true, // You can add health check here
      }
    };
  }

  /**
   * Setup event handlers for the LiveKit room
   */
  private setupEventHandlers(): void {
    if (!this.room) return;

    // Connection events
    this.room.on(RoomEvent.Connected, () => {
      console.log('🟢 LiveKit room connected');
      this.isConnected = true;
    });

    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.log('🔴 LiveKit room disconnected:', reason);
      this.isConnected = false;
      this.callbacks.onDisconnected?.();
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('🟡 LiveKit room reconnecting...');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log('🟢 LiveKit room reconnected');
      this.isConnected = true;
    });

    // Participant events
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('👤 Participant joined:', participant.identity);
      this.callbacks.onParticipantJoined?.(participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('👤 Participant left:', participant.identity);
      this.callbacks.onParticipantLeft?.(participant);
    });

    // Track events
    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
      console.log('🎵 Track subscribed:', track.kind, 'from', participant.identity);
      
      if (track.kind === Track.Kind.Audio) {
        this.callbacks.onRemoteAudioTrack?.(track as RemoteAudioTrack, participant);
      }
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
      console.log('🔇 Track unsubscribed:', track.kind, 'from', participant.identity);
    });

    // Data events
    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: RemoteParticipant | undefined) => {
      console.log('📨 Data received from:', participant?.identity);
      if (participant) {
        this.callbacks.onDataReceived?.(payload, participant);
      }
    });

    // Connection quality events
    this.room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant: RemoteParticipant) => {
      console.log('📊 Connection quality changed:', quality, 'for', participant.identity);
      this.callbacks.onConnectionQualityChanged?.(quality, participant);
    });

    // Handle errors
    this.room.on(RoomEvent.RoomMetadataChanged, (metadata) => {
      console.log('📋 Room metadata changed:', metadata);
    });
  }

  /**
   * Get connection status
   */
  isConnectedToPlatform(): boolean {
    return this.isConnected && 
           this.room?.state === RoomState.Connected &&
           this.orchestratorWs?.readyState === WebSocket.OPEN &&
           this.sessionId !== null;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get current room name
   */
  getCurrentRoom(): string | null {
    return this.currentRoomName;
  }

  /**
   * Get list of participants
   */
  getParticipants(): any[] {
    if (!this.room) return [];
    
    return Array.from(this.room.remoteParticipants.values()).map(p => ({
      identity: p.identity,
      name: p.name,
      isConnected: p.isConnected,
      isSpeaking: p.isSpeaking,
      hasAudio: p.audioTrackPublications.size > 0,
    }));
  }
}