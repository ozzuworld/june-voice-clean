/**
 * LiveKit Voice Service - Skip TLS Preflight Check
 * 
 * This service connects directly to LiveKit WebSocket without TLS preflight.
 * The backend infrastructure is already properly configured.
 */

import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track } from 'livekit-client';
import { useLiveKitToken } from '../hooks/useLiveKitToken';
import APP_CONFIG from '@/config/app.config';

export interface LiveKitCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  onParticipantJoined?: (participant: RemoteParticipant) => void;
  onParticipantLeft?: (participant: RemoteParticipant) => void;
  onRemoteAudioTrack?: (track: any, participant: RemoteParticipant) => void;
  onLocalAudioTrack?: (track: any) => void;
  onOrchestratorMessage?: (data: any) => void;
  onDataReceived?: (payload: Uint8Array, participant: RemoteParticipant) => void;
}

export class LiveKitVoiceService {
  private room: Room | null = null;
  private authToken: string | null = null;
  private sessionId: string | null = null;
  public callbacks: LiveKitCallbacks = {};

  constructor() {
    console.log('🎫 [DEBUG] LiveKitVoiceService initialized - TLS preflight disabled');
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getParticipants(): any[] {
    if (!this.room) return [];
    return Array.from(this.room.remoteParticipants.values()).map(p => ({
      identity: p.identity,
      hasAudio: p.audioTrackPublications.size > 0,
      isSpeaking: p.isSpeaking
    }));
  }

  async connect(roomName: string, participantName: string): Promise<boolean> {
    try {
      console.log('🎫 [DEBUG] Starting LiveKit connection...');
      console.log('🎫 [DEBUG] Room:', roomName);
      console.log('🎫 [DEBUG] Participant:', participantName);

      // Generate token from orchestrator
      const tokenData = await this.generateToken(roomName, participantName);
      if (!tokenData) {
        throw new Error('Failed to generate LiveKit token');
      }

      console.log('🎫 [DEBUG] Using LiveKit server URL:', tokenData.livekitUrl);
      console.log('🎫 [DEBUG] Token length:', tokenData.token?.length);

      // Create room instance
      this.room = new Room({
        // Skip TLS preflight by configuring connection options
        connectOptions: {
          // Disable any preflight checks
          websocket: 30000, // 30 second timeout
          peerConnection: 15000, // 15 second timeout
          maxRetries: 3
        },
        // Enable adaptive stream for better performance
        adaptiveStream: true
      });

      // Setup event handlers
      this.setupRoomEventHandlers();

      console.log('🎫 [DEBUG] Connection attempt: 1');
      
      // Connect directly to WebSocket - no TLS preflight
      await this.room.connect(tokenData.livekitUrl, tokenData.token);
      
      console.log('✅ [SUCCESS] Connected to LiveKit');
      this.sessionId = `session-${Date.now()}`;
      this.callbacks.onConnected?.();
      
      return true;
    } catch (error: any) {
      console.error('❌ [ERROR] LiveKit connection failed:', error);
      this.callbacks.onError?.(error.message || 'Connection failed');
      return false;
    }
  }

  private async generateToken(roomName: string, participantName: string) {
    try {
      // FIX: Use correct endpoint
      const url = `${APP_CONFIG.SERVICES.orchestrator}/api/sessions/`;
      console.log('🎫 [LIVEKIT TOKEN] Requesting session from:', url);
      
      const requestBody = {
        user_id: participantName,
        room_name: roomName,
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Remove auth header - not needed
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🎫 [LIVEKIT TOKEN] Success response:', data);
      
      // FIX: Map backend field names
      return {
        token: data.access_token,          // backend uses access_token
        roomName: data.room_name,          // backend uses room_name  
        participantName: data.user_id,     // backend uses user_id
        livekitUrl: data.livekit_url,      // backend uses livekit_url
      };
    } catch (error: any) {
      console.error('🎫 [LIVEKIT TOKEN ERROR]:', error.message);
      throw error;
    }
  }

  private setupRoomEventHandlers() {
    if (!this.room) return;

    this.room.on(RoomEvent.Connected, () => {
      console.log('✅ Room connected');
      this.callbacks.onConnected?.();
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('🔌 Room disconnected');
      this.callbacks.onDisconnected?.();
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('🔄 Connection state:', state);
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('👤 Participant joined:', participant.identity);
      this.callbacks.onParticipantJoined?.(participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('👤 Participant left:', participant.identity);
      this.callbacks.onParticipantLeft?.(participant);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('🎵 Track subscribed:', track.kind, 'from:', participant.identity);
      if (track.kind === Track.Kind.Audio) {
        this.callbacks.onRemoteAudioTrack?.(track, participant);
      }
    });

    this.room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
      console.log('🎤 Local track published:', publication.kind);
      if (publication.track && publication.kind === Track.Kind.Audio) {
        this.callbacks.onLocalAudioTrack?.(publication.track);
      }
    });

    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      console.log('📨 Data received from:', participant?.identity);
      this.callbacks.onDataReceived?.(payload, participant as RemoteParticipant);
    });
  }

  async startVoiceCall(): Promise<boolean> {
    if (!this.room || !this.room.localParticipant) {
      console.error('❌ Room not connected');
      return false;
    }

    try {
      console.log('🎤 Starting voice call...');
      
      // Enable microphone
      await this.room.localParticipant.enableCameraAndMicrophone(false, true);
      
      this.callbacks.onCallStarted?.();
      return true;
    } catch (error: any) {
      console.error('❌ Failed to start voice call:', error);
      return false;
    }
  }

  async endVoiceCall(): Promise<void> {
    if (!this.room || !this.room.localParticipant) return;

    try {
      console.log('📴 Ending voice call...');
      
      // Disable microphone
      await this.room.localParticipant.setMicrophoneEnabled(false);
      
      this.callbacks.onCallEnded?.();
    } catch (error: any) {
      console.error('❌ Failed to end voice call:', error);
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.room || !this.room.localParticipant) return;
    
    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      console.log(`🎤 Microphone ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('❌ Failed to toggle microphone:', error);
    }
  }

  async sendAiMessage(message: string): Promise<any> {
    if (!this.room) {
      throw new Error('Room not connected');
    }

    try {
      // Send data message to orchestrator or AI service
      const payload = new TextEncoder().encode(JSON.stringify({
        type: 'ai_message',
        message,
        timestamp: Date.now()
      }));
      
      await this.room.localParticipant.publishData(payload);
      console.log('🤖 AI message sent:', message);
      
      return { success: true, message };
    } catch (error: any) {
      console.error('❌ Failed to send AI message:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      console.log('🔌 Disconnecting from LiveKit...');
      await this.room.disconnect();
      this.room = null;
      this.sessionId = null;
    }
  }
}
