import { Audio } from 'expo-av';
import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system';

export function useAudioPlayer() {
  const playAudioFromBase64 = useCallback(async (audioData: string) => {
    try {
      console.log('🔊 Playing Base64 audio');
      const { sound } = await Audio.Sound.createAsync({
        uri: `data:audio/wav;base64,${audioData}`
      });
      await sound.playAsync();
      
      // Cleanup
      sound.unloadAsync();
    } catch (error) {
      console.error('❌ Base64 audio playback failed:', error);
    }
  }, []);

  const playAudioFromBinary = useCallback(async (audioBuffer: ArrayBuffer, format: string = 'wav') => {
    try {
      console.log(`🔊 Playing binary audio: ${audioBuffer.byteLength} bytes (${format})`);
      
      // Convert ArrayBuffer to Base64 for Expo Audio
      const uint8Array = new Uint8Array(audioBuffer);
      const binaryString = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
      const base64Audio = btoa(binaryString);
      
      // Play using data URI
      const { sound } = await Audio.Sound.createAsync({
        uri: `data:audio/${format};base64,${base64Audio}`
      });
      
      await sound.playAsync();
      
      // Cleanup
      sound.unloadAsync();
    } catch (error) {
      console.error('❌ Binary audio playback failed:', error);
    }
  }, []);

  const playAudioFromFile = useCallback(async (filePath: string) => {
    try {
      console.log('🔊 Playing audio file:', filePath);
      const { sound } = await Audio.Sound.createAsync({ uri: filePath });
      await sound.playAsync();
      
      // Cleanup
      sound.unloadAsync();
    } catch (error) {
      console.error('❌ File audio playback failed:', error);
    }
  }, []);

  // Alternative: Write binary data to temp file and play
  const playAudioFromBinaryFile = useCallback(async (audioBuffer: ArrayBuffer, format: string = 'wav') => {
    try {
      console.log(`🔊 Playing binary audio via file: ${audioBuffer.byteLength} bytes`);
      
      // Create temporary file
      const tempPath = `${FileSystem.documentDirectory}temp_audio.${format}`;
      
      // Convert ArrayBuffer to Base64
      const uint8Array = new Uint8Array(audioBuffer);
      const binaryString = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
      const base64Audio = btoa(binaryString);
      
      // Write to file
      await FileSystem.writeAsStringAsync(tempPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Play file
      const { sound } = await Audio.Sound.createAsync({ uri: tempPath });
      await sound.playAsync();
      
      // Cleanup
      await sound.unloadAsync();
      await FileSystem.deleteAsync(tempPath, { idempotent: true });
    } catch (error) {
      console.error('❌ Binary file audio playback failed:', error);
    }
  }, []);

  return { 
    playAudioFromBase64, 
    playAudioFromBinary,
    playAudioFromFile,
    playAudioFromBinaryFile 
  };
}
