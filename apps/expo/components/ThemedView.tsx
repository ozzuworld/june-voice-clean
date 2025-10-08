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