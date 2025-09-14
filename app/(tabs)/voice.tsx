// app/(tabs)/voice.tsx
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VoiceCircle } from '@/components/VoiceCircle';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useVoice } from '@/hooks/useVoice';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width } = Dimensions.get('window');

export default function VoiceScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const { 
    isListening, 
    isProcessing, 
    isPlaying, 
    transcription, 
    aiResponse, 
    error,
    startListening,
    stopListening
  } = useVoice();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleVoicePress = () => {
    if (isListening) {
      stopListening();
    } else if (!isProcessing && !isPlaying) {
      startListening();
    }
  };

  const getStatusText = () => {
    if (error) return error;
    if (isListening) return 'Listening...';
    if (isProcessing) return 'Processing...';
    if (isPlaying) return 'Speaking...';
    return 'Tap to speak with June';
  };

  const getSubText = () => {
    if (transcription && aiResponse) {
      return `You: ${transcription}\n\nJune: ${aiResponse}`;
    }
    if (transcription) {
      return `You said: ${transcription}`;
    }
    return `Hello ${user?.name || 'there'}! Tap the circle to start a voice conversation with June.`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim }
        ]}
      >
        {/* Voice Circle */}
        <TouchableOpacity
          onPress={handleVoicePress}
          activeOpacity={0.8}
          disabled={isProcessing}
          style={styles.circleContainer}
        >
          <VoiceCircle
            isListening={isListening}
            isProcessing={isProcessing}
            isPlaying={isPlaying}
            hasError={!!error}
          />
        </TouchableOpacity>

        {/* Status Text */}
        <ThemedText style={styles.statusText}>
          {getStatusText()}
        </ThemedText>
        
        {/* Conversation Display */}
        <ThemedView style={styles.conversationContainer}>
          <ThemedText style={styles.conversationText}>
            {getSubText()}
          </ThemedText>
        </ThemedView>

        {/* Instructions */}
        <ThemedView style={styles.instructionsContainer}>
          <ThemedText style={styles.instructionsText}>
            {isListening ? 'Speak now...' : 'Press and hold the circle to talk'}
          </ThemedText>
        </ThemedView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  circleContainer: {
    marginBottom: 60,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  conversationContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    maxWidth: width - 80,
  },
  conversationText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  instructionsContainer: {
    backgroundColor: 'transparent',
  },
  instructionsText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
  },
});