// src/components/VoiceCircle.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface VoiceCircleProps {
  isListening: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  hasError: boolean;
  size?: number;
  style?: ViewStyle;
}

export function VoiceCircle({
  isListening,
  isProcessing,
  isPlaying,
  hasError,
  size = 200,
  style,
}: VoiceCircleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isListening, isProcessing, isPlaying]);

  const getCircleColor = () => {
    if (hasError) return colors.danger;
    if (isListening) return colors.success;
    if (isProcessing) return colors.warning;
    if (isPlaying) return '#ff3366';
    return colors.primary;
  };

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const glowStyle = {
    width: size * 1.5,
    height: size * 1.5,
    borderRadius: size * 0.75,
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[
        styles.glow,
        glowStyle,
        {
          backgroundColor: getCircleColor(),
          opacity: glowAnim,
          transform: [{ scale: pulseAnim }],
        }
      ]} />
      <Animated.View style={[
        styles.circle,
        circleStyle,
        {
          backgroundColor: getCircleColor(),
          transform: [{ scale: pulseAnim }],
        }
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  circle: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
});