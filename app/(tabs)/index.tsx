// app/(tabs)/index.tsx
import { Redirect } from 'expo-router';

export default function TabsIndex() {
  // Redirect to the chat tab by default
  return <Redirect href="/chat" />;
}
