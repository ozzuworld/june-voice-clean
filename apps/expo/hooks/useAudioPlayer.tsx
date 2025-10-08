import { Audio } from 'expo-av';
import { useCallback } from 'react';

export function useAudioPlayer() {
  const playAudioFromBase64 = useCallback(async (audioData: string) => {
    try {
      // Convert base64 to audio file and play
      const { sound } = await Audio.Sound.createAsync({
        uri: `data:audio/wav;base64,${audioData}`
      });
      await sound.playAsync();
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  }, []);

  return { playAudioFromBase64 };
}
