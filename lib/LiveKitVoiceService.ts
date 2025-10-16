import { Room, RoomEvent, RemoteParticipant, Track } from 'livekit-client';
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
  onDataReceived?: (payload: Uint8Array, participant: RemoteParticipant) => void;
}

export class LiveKitVoiceService {
  private room: Room | null = null;
  private sessionId: string | null = null;
  public callbacks: LiveKitCallbacks = {};

  constructor() {
    console.log('🎫 [DEBUG] LiveKitVoiceService initialized');
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

      // Generate token from backend
      const tokenData = await this.generateToken(roomName, participantName);
      if (!tokenData) {
        throw new Error('Failed to generate LiveKit token');
      }

      console.log('🎫 [DEBUG] Using LiveKit URL:', tokenData.livekitUrl);
      console.log('🎫 [DEBUG] Token length:', tokenData.token?.length);

      // Create room instance
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Setup event handlers
      this.setupRoomEventHandlers();

      // Connect to room
      console.log('🎫 [DEBUG] Connecting to room...');
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
      const url = `${APP_CONFIG.SERVICES.orchestrator}/api/sessions/`;
      console.log('🎫 [TOKEN] Requesting from:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: participantName,
          room_name: roomName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🎫 [TOKEN] Success');
      
      return {
        token: data.access_token,
        roomName: data.room_name,
        participantName: data.user_id,
        livekitUrl: data.livekit_url || APP_CONFIG.SERVICES.livekit,
      };
    } catch (error: any) {
      console.error('🎫 [TOKEN ERROR]:', error.message);
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

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('👤 Participant joined:', participant.identity);
      this.callbacks.onParticipantJoined?.(participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('👤 Participant left:', participant.identity);
      this.callbacks.onParticipantLeft?.(participant);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('🎵 Track subscribed:', track.kind);
      if (track.kind === Track.Kind.Audio) {
        this.callbacks.onRemoteAudioTrack?.(track, participant);
      }
    });

    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      console.log('📨 Data received');
      this.callbacks.onDataReceived?.(payload, participant as RemoteParticipant);
    });
  }

  async startVoiceCall(): Promise<boolean> {
    if (!this.room?.localParticipant) {
      console.error('❌ Room not connected');
      return false;
    }

    try {
      console.log('🎤 Starting voice call...');
      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.callbacks.onCallStarted?.();
      return true;
    } catch (error: any) {
      console.error('❌ Failed to start voice call:', error);
      return false;
    }
  }

  async endVoiceCall(): Promise<void> {
    if (!this.room?.localParticipant) return;

    try {
      console.log('📴 Ending voice call...');
      await this.room.localParticipant.setMicrophoneEnabled(false);
      this.callbacks.onCallEnded?.();
    } catch (error: any) {
      console.error('❌ Failed to end voice call:', error);
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.room?.localParticipant) return;
    
    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      console.log(`🎤 Microphone ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('❌ Failed to toggle microphone:', error);
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