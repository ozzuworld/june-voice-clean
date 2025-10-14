/**
 * LiveKit Voice Service
 * Updated to follow finalized client flow:
 * 1) create session with orchestrator → receive LiveKit JWT + livekit_url
 * 2) connect directly to LiveKit with that token
 * 3) optionally open an app-level channel to the orchestrator for AI/UX messages
 */

import { Room, RoomEvent, LocalTrack, LocalAudioTrack, RemoteTrack, RemoteAudioTrack, Track, AudioCaptureOptions, RoomOptions, ConnectOptions, DataPacket_Kind, RoomState, ConnectionQuality, RemoteParticipant } from 'livekit-client';
import { getLiveKitConfig, obtainSessionAndToken } from '../config/livekit';
import { JuneApiClient } from '../config/api';
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
  onOrchestratorMessage?: (data: any) => void; // optional app-level channel
}

export class LiveKitVoiceService {
  private room: Room | null = null;
  private callbacks: LiveKitCallbacks;
  private localAudioTrack: LocalAudioTrack | null = null;
  private isConnected = false;
  private currentRoomName: string | null = null;
  private juneApi: JuneApiClient;
  private orchestratorWs: WebSocket | null = null; // optional
  private sessionId: string | null = null;

  constructor(callbacks: LiveKitCallbacks = {}) {
    this.callbacks = callbacks;
    this.juneApi = new JuneApiClient();
  }

  setAuthToken(token: string): void { this.juneApi.setAuthToken(token); }

  async connect(roomName: string, participantName: string): Promise<boolean> {
    try {
      // 1) Create session → get { sessionId, accessToken, livekitUrl }
      const { sessionId, accessToken, livekitUrl, roomName: resolvedRoom } = await obtainSessionAndToken(roomName, participantName);
      this.sessionId = sessionId;
      this.currentRoomName = resolvedRoom;

      // 2) Connect to LiveKit using token
      this.room = new Room();
      this.setupEventHandlers();

      const fallback = getLiveKitConfig();
      const roomOptions: RoomOptions = { adaptiveStream: true, dynacast: true, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as AudioCaptureOptions, disconnectOnPageLeave: true };
      const connectOptions: ConnectOptions = { autoSubscribe: true, rtcConfig: { iceServers: fallback.iceServers, iceCandidatePoolSize: 10 } };

      await this.room.connect(livekitUrl || fallback.serverUrl, accessToken, connectOptions);
      this.isConnected = true;
      this.callbacks.onConnected?.();

      // 3) Optional: app-level orchestrator channel (feature-gated; endpoint may not exist yet)
      // this.orchestratorWs = await this.juneApi.connectWebSocket(sessionId, (data) => this.callbacks.onOrchestratorMessage?.(data));

      return true;
    } catch (e) {
      await this.cleanup();
      const msg = e instanceof Error ? e.message : 'Failed to connect to June platform';
      this.callbacks.onError?.(msg);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.cleanup();
    if (this.sessionId) {
      try { await this.juneApi.deleteSession(this.sessionId); } catch {}
      this.sessionId = null;
    }
    this.callbacks.onDisconnected?.();
  }

  private async cleanup(): Promise<void> {
    if (this.localAudioTrack) { this.localAudioTrack.stop(); this.localAudioTrack = null; }
    if (this.room) { await this.room.disconnect(); this.room = null; }
    if (this.orchestratorWs) { this.orchestratorWs.close(); this.orchestratorWs = null; }
    this.isConnected = false;
    this.currentRoomName = null;
  }

  async startVoiceCall(): Promise<boolean> {
    if (!this.isConnected || !this.room) throw new Error('Not connected to June platform');
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) throw new Error('Microphone permission denied. Please grant microphone access.');

    this.localAudioTrack = await LocalTrack.createAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true } as AudioCaptureOptions);
    await this.room.localParticipant.publishTrack(this.localAudioTrack, { name: 'microphone', source: Track.Source.Microphone });
    this.callbacks.onLocalAudioTrack?.(this.localAudioTrack);
    this.callbacks.onCallStarted?.();
    return true;
  }

  async endVoiceCall(): Promise<void> {
    if (this.localAudioTrack && this.room) {
      await this.room.localParticipant.unpublishTrack(this.localAudioTrack);
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
    this.callbacks.onCallEnded?.();
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (this.localAudioTrack) await this.localAudioTrack.setEnabled(enabled);
  }

  async sendAiMessage(message: string): Promise<any> {
    if (!this.sessionId) throw new Error('No active session');
    return this.juneApi.sendAiMessage(message, this.sessionId);
  }

  async sendDataMessage(message: string): Promise<void> {
    if (!this.room || !this.isConnected) return;
    const encoder = new TextEncoder();
    await this.room.localParticipant.publishData(encoder.encode(message), DataPacket_Kind.RELIABLE);
  }

  async getConversationHistory(): Promise<any> {
    if (!this.sessionId) throw new Error('No active session');
    return this.juneApi.getConversationHistory(this.sessionId);
  }

  private setupEventHandlers(): void {
    if (!this.room) return;
    this.room.on(RoomEvent.Connected, () => { this.isConnected = true; });
    this.room.on(RoomEvent.Disconnected, () => { this.isConnected = false; this.callbacks.onDisconnected?.(); });
    this.room.on(RoomEvent.ParticipantConnected, (p) => this.callbacks.onParticipantJoined?.(p));
    this.room.on(RoomEvent.ParticipantDisconnected, (p) => this.callbacks.onParticipantLeft?.(p));
    this.room.on(RoomEvent.TrackSubscribed, (track, _pub, p) => { if (track.kind === Track.Kind.Audio) this.callbacks.onRemoteAudioTrack?.(track as RemoteAudioTrack, p as RemoteParticipant); });
    this.room.on(RoomEvent.DataReceived, (payload, p) => { if (p) this.callbacks.onDataReceived?.(payload, p as RemoteParticipant); });
    this.room.on(RoomEvent.ConnectionQualityChanged, (q, p) => this.callbacks.onConnectionQualityChanged?.(q, p as RemoteParticipant));
  }

  isConnectedToPlatform(): boolean {
    return this.isConnected && this.room?.state === RoomState.Connected && this.sessionId !== null;
  }

  getSessionId(): string | null { return this.sessionId; }
  getCurrentRoom(): string | null { return this.currentRoomName; }
  getParticipants(): any[] {
    if (!this.room) return [];
    return Array.from(this.room.remoteParticipants.values()).map(p => ({ identity: p.identity, name: p.name, isConnected: p.isConnected, isSpeaking: p.isSpeaking, hasAudio: p.audioTrackPublications.size > 0 }));
  }
}
