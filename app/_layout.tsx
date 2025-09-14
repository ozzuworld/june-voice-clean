// app/_layout.tsx - Root layout with all providers
import { Stack } from 'expo-router';
import { AuthProvider } from '@/hooks/useAuth';
import { ChatProvider } from '@/hooks/useChat';
import { VoiceProvider } from '@/hooks/useVoice';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ChatProvider>
        <VoiceProvider>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </VoiceProvider>
      </ChatProvider>
    </AuthProvider>
  );
}