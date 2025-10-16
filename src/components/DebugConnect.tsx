// src/components/DebugConnect.tsx

import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { Room, RoomEvent, RoomState, connect } from 'livekit-client';

interface Props {
  serverUrl: string;
  token: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export const DebugConnect: React.FC<Props> = ({ serverUrl, token, onConnected, onDisconnected }) => {
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        console.log('DebugConnect: calling connect', { serverUrl, tokenLen: token?.length });
        const room = await connect(serverUrl, token, { autoSubscribe: true });
        if (!active) return;
        roomRef.current = room;
        console.log('DebugConnect: connected, state=', room.state);
        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          console.log('DebugConnect: state=', state);
        });
        onConnected?.();
      } catch (e) {
        console.error('DebugConnect: connect() threw', e);
      }
    })();

    return () => {
      active = false;
      const r = roomRef.current;
      if (r) {
        console.log('DebugConnect: disconnecting');
        r.disconnect();
      }
      onDisconnected?.();
    };
  }, [serverUrl, token]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1426' }}>
      <Text style={{ color: '#FFF', fontSize: 18 }}>Connecting (debug)…</Text>
    </View>
  );
};