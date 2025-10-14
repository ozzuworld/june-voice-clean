import { useEffect, useMemo, useRef, useState } from 'react';
import { LiveKitVoiceService, LiveKitCallbacks } from '../lib/LiveKitVoiceService';

export interface UseLiveKitOptions {
  roomName?: string;
  participantName: string;
  autoConnect?: boolean;
}

export const useLiveKit = ({
  roomName = 'default-room',
  participantName,
  autoConnect = false,
}: UseLiveKitOptions) => {
  const [connected, setConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const svcRef = useRef<LiveKitVoiceService | null>(null);

  const callbacks: LiveKitCallbacks = useMemo(
    () => ({
      onConnected: () => setConnected(true),
      onDisconnected: () => {
        setConnected(false);
        setInCall(false);
      },
      onError: (msg) => setError(msg),
      onCallStarted: () => setInCall(true),
      onCallEnded: () => setInCall(false),
    }),
    []
  );

  useEffect(() => {
    svcRef.current = new LiveKitVoiceService(callbacks);
    if (autoConnect) {
      void connect(roomName, participantName);
    }
    return () => {
      void svcRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async (room: string, participant: string) => {
    setError(null);
    const ok = await svcRef.current?.connect(room, participant);
    if (!ok) setConnected(false);
    return ok;
  };

  const disconnect = async () => {
    await svcRef.current?.disconnect();
  };

  const start = async () => {
    setError(null);
    const ok = await svcRef.current?.startVoiceCall();
    if (ok) setMuted(false);
    return ok;
  };

  const end = async () => {
    await svcRef.current?.endVoiceCall();
    setMuted(false);
  };

  const toggleMute = async () => {
    const next = !muted;
    await svcRef.current?.setMicrophoneEnabled(!next);
    setMuted(next);
  };

  const send = async (message: string) => {
    await svcRef.current?.sendDataMessage(message);
  };

  return {
    connected,
    inCall,
    muted,
    error,
    connect,
    disconnect,
    start,
    end,
    toggleMute,
    send,
    getParticipants: () => svcRef.current?.getParticipants() ?? [],
    getRoomStats: () => svcRef.current?.getRoomStats(),
  };
};