/**
 * LiveKit Voice Service
 * 
 * Handles voice communication using LiveKit for the June Voice Platform
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
}

export class LiveKitVoiceService {
  private room: Room | null = null;
  private config: LiveKitConfig;
  private callbacks: LiveKitCallbacks;
  private localAudioTrack: LocalAudioTrack | null = null;
  private isConnected = false;
  private currentRoomName: string | null = null;

  constructor(callbacks: LiveKitCallbacks = {}) {
    this.config = getLiveKitConfig();
    this.callbacks = callbacks;
  }

  /**
   * Connect to a LiveKit room
   */
  async connect(roomName: string, participantName: string): Promise<boolean> {
    try {
      console.log('🔗 Connecting to LiveKit room:', roomName);
      
      // Initialize room
      this.room = new Room();
      this.currentRoomName = roomName;
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Generate access token
      console.log('🎫 Generating access token...');
      const token = await generateAccessToken(roomName, participantName);
      
      // Configure room options
      const roomOptions: RoomOptions = {
        // Configure adaptive streams and bandwidth
        adaptiveStream: true,
        dynacast: true,
        
        // Audio settings
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as AudioCaptureOptions,
        
        // Reconnection settings
        disconnectOnPageLeave: true,
      };

      // Connect options with ICE servers
      const connectOptions: ConnectOptions = {
        autoSubscribe: true,
        rtcConfig: {
          iceServers: this.config.iceServers,
          iceCandidatePoolSize: 10,
        },
      };
      
      // Connect to room
      console.log('📡 Connecting to LiveKit server:', this.config.serverUrl);
      await this.room.connect(this.config.serverUrl, token, connectOptions);
      
      this.isConnected = true;
      console.log('✅ Successfully connected to LiveKit room');
      this.callbacks.onConnected?.();
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to connect to LiveKit:', error);
      let errorMessage = 'Failed to connect to voice room';
      
      if (error instanceof Error) {
        if (error.message.includes('token')) {
          errorMessage = 'Authentication failed. Please check your credentials.';
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
   * Disconnect from the room
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from LiveKit...');
    
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
    
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    
    this.isConnected = false;
    this.currentRoomName = null;
    this.callbacks.onDisconnected?.();
  }

  /**
   * Start voice call (enable microphone)
   */
  async startVoiceCall(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.room) {
        throw new Error('Not connected to LiveKit room');
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
   * Send data message to all participants
   */
  async sendDataMessage(message: string): Promise<void> {
    if (this.room && this.isConnected) {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      
      await this.room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      console.log('📤 Data message sent:', message);
    }
  }

  /**
   * Get current room statistics
   */
  getRoomStats(): any {
    if (!this.room) return null;
    
    return {
      participants: this.room.numParticipants,
      isConnected: this.isConnected,
      roomName: this.currentRoomName,
      connectionState: this.room.state,
      localParticipant: this.room.localParticipant.identity,
    };
  }

  /**
   * Setup event handlers for the room
   */
  private setupEventHandlers(): void {
    if (!this.room) return;

    // Connection events
    this.room.on(RoomEvent.Connected, () => {
      console.log('🟢 Room connected');
      this.isConnected = true;
    });

    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.log('🔴 Room disconnected:', reason);
      this.isConnected = false;
      this.callbacks.onDisconnected?.();
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('🟡 Room reconnecting...');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log('🟢 Room reconnected');
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
  isConnectedToRoom(): boolean {
    return this.isConnected && this.room?.state === RoomState.Connected;
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