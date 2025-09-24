// app/(tabs)/index.tsx - Redirect to chat as default tab
import { Redirect } from 'expo-router';

export default function TabsIndex() {
  return <Redirect href="/(tabs)/chat" />;
}