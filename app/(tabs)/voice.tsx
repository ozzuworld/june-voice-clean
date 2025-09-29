// app/(tabs)/voice.tsx
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VoiceCircle } from '@/components/VoiceCircle';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useVoice } from '@/hooks/useVoice'; // Import from real hooks file
import { useColorScheme } from '@/hooks/useColorScheme';



const { width, height } = Dimensions.get('window');
const isLandscape = width > height;

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
    stopListening,
    clearError,
    resetVoice
  } = useVoice();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const brandFadeAnim = useRef(new Animated.Value(0)).current;
  const brandScaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial animation sequence
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(brandFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(brandScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtle breathing animation for the brand
    const breathe = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const timer = setTimeout(breathe, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Handle errors with auto-clear
  useEffect(() => {
    if (error) {
      console.error('Voice error:', error);
      // Auto-clear errors after 5 seconds
      const timer = setTimeout(() => {
        if (clearError) {
          clearError();
        }
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleVoicePress = async () => {
    try {
      if (isListening) {
        console.log('🛑 Stopping voice recording');
        await stopListening();
      } else if (!isProcessing && !isPlaying) {
        console.log('🎤 Starting voice recording');
        await startListening();
      }
    } catch (error) {
      console.error('Voice press error:', error);
    }
  };

  const getStatusText = () => {
    if (error) return error;
    if (isListening) return 'Listening...';
    if (isProcessing) return 'Processing...';
    if (isPlaying) return 'Speaking...';
    return null;
  };

  const showResponse = transcription || aiResponse;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" hidden />
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[
            isLandscape ? styles.contentLandscape : styles.content,
            { opacity: fadeAnim }
          ]}
        >
          {/* Brand Section */}
          <Animated.View
            style={[
              isLandscape ? styles.brandContainerLandscape : styles.brandContainer,
              {
                opacity: brandFadeAnim,
                transform: [
                  { scale: Animated.multiply(brandScaleAnim, pulseAnim) }
                ]
              }
            ]}
          >
            <ThemedText style={[
              styles.brandText,
              isLandscape && styles.brandTextLandscape
            ]}>
              OZZU
            </ThemedText>
          </Animated.View>

          {/* Voice Circle */}
          <TouchableOpacity
            onPress={handleVoicePress}
            activeOpacity={0.8}
            disabled={isProcessing}
            style={[
              styles.circleContainer,
              isLandscape && styles.circleContainerLandscape
            ]}
          >
            <VoiceCircle
              isListening={isListening}
              isProcessing={isProcessing}
              isPlaying={isPlaying}
              hasError={!!error}
              size={isLandscape ? 120 : 160}
            />
          </TouchableOpacity>

          {/* Status Text */}
          {getStatusText() && (
            <Animated.View style={styles.statusContainer}>
              <ThemedText style={styles.statusText}>
                {getStatusText()}
              </ThemedText>
            </Animated.View>
          )}

          {/* Response Display */}
          {showResponse && (
            <Animated.View style={[
              styles.responseContainer,
              isLandscape && styles.responseContainerLandscape
            ]}>
              {transcription && (
                <ThemedView style={styles.transcriptionBubble}>
                  <ThemedText style={styles.transcriptionLabel}>You said:</ThemedText>
                  <ThemedText style={styles.transcriptionText}>
                    "{transcription}"
                  </ThemedText>
                </ThemedView>
              )}
              
              {aiResponse && (
                <ThemedView style={styles.responseBubble}>
                  <ThemedText style={styles.responseLabel}>OZZU:</ThemedText>
                  <ThemedText style={styles.responseText}>
                    {aiResponse}
                  </ThemedText>
                </ThemedView>
              )}
            </Animated.View>
          )}

          {/* Subtle Hint */}
          {!isListening && !isProcessing && !isPlaying && !showResponse && (
            <Animated.View style={[
              styles.hintContainer,
              isLandscape && styles.hintContainerLandscape
            ]}>
              <ThemedText style={styles.hintText}>
                Tap to speak
              </ThemedText>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  contentLandscape: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  brandContainer: {
    position: 'absolute',
    top: height * 0.15,
    alignItems: 'center',
  },
  brandContainerLandscape: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 48,
    fontWeight: '100',
    letterSpacing: 8,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'System',
  },
  brandTextLandscape: {
    fontSize: 40,
    letterSpacing: 6,
  },
  circleContainer: {
    marginTop: 60,
    marginBottom: 40,
  },
  circleContainerLandscape: {
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 40,
  },
  statusContainer: {
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  responseContainer: {
    position: 'absolute',
    bottom: 100,
    left: 30,
    right: 30,
    maxHeight: height * 0.3,
  },
  responseContainerLandscape: {
    position: 'absolute',
    bottom: 60,
    left: 30,
    right: 30,
    maxHeight: height * 0.4,
  },
  transcriptionBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  responseBubble: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  responseText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  hintContainerLandscape: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#FFFFFF',
    opacity: 0.4,
    textAlign: 'center',
    letterSpacing: 1,
  },
});