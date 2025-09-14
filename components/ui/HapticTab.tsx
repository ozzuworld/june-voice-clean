// src/components/ui/HapticTab.tsx
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

// src/components/ui/IconSymbol.tsx
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

// Simple mapping for common icons
const ICON_MAPPING = {
  'message.circle': 'chat',
  'mic.circle': 'mic',
  'house.fill': 'home',
  'paperplane.fill': 'send',
} as const;

type IconName = keyof typeof ICON_MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) {
  const iconName = ICON_MAPPING[name] || 'help';
  return <MaterialIcons name={iconName as any} size={size} color={color} style={style} />;
}

// src/components/ui/TabBarBackground.tsx
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabBarBackground() {
  const colorScheme = useColorScheme();
  
  return (
    <BlurView
      tint={colorScheme === 'dark' ? 'dark' : 'light'}
      intensity={95}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

// src/hooks/useColorScheme.ts
import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme() {
  return useRNColorScheme();
}

// src/components/ThemedText.tsx
import { Text, type TextProps, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const theme = useColorScheme() ?? 'light';
  const color = lightColor && theme === 'light' 
    ? lightColor 
    : darkColor && theme === 'dark' 
    ? darkColor 
    : Colors[theme].text;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});

// src/components/ThemedView.tsx
import { View, type ViewProps } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const theme = useColorScheme() ?? 'light';
  const backgroundColor = lightColor && theme === 'light' 
    ? lightColor 
    : darkColor && theme === 'dark' 
    ? darkColor 
    : Colors[theme].background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}

// src/components/ChatMessage.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Message } from '@/types/chat.types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[
      styles.messageContainer,
      message.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <ThemedView style={[
        styles.messageBubble,
        message.isUser 
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }
      ]}>
        {message.isVoice && (
          <ThemedText style={[styles.voiceIndicator, { color: colors.success }]}>
            🎤 Voice message
          </ThemedText>
        )}
        
        <ThemedText style={[
          styles.messageText,
          { color: message.isUser ? 'white' : colors.text }
        ]}>
          {message.text}
        </ThemedText>
      </ThemedView>
      
      <ThemedText style={[styles.timestamp, { color: colors.textSecondary }]}>
        {message.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  botMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  voiceIndicator: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    alignSelf: 'center',
  },
});