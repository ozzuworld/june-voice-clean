// app/_layout.tsx — Add back the missing providers
import { Stack } from 'expo-router';
import { AuthProvider } from '@/hooks/useAuth';
import { ChatProvider } from '@/hooks/useChat';
import { VoiceProvider } from '@/hooks/useVoice';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ChatProvider>
        <VoiceProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </VoiceProvider>
      </ChatProvider>
    </AuthProvider>
  );
}