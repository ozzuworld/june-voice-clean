// app/(tabs)/index.tsx - Enhanced redirect with fallback
import { useEffect } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';

export default function TabsIndex() {
  const router = useRouter();
  
  useEffect(() => {
    // Fallback navigation in case Redirect doesn't work
    const timer = setTimeout(() => {
      console.log('🔄 Tabs index - fallback navigation to chat');
      router.replace('/chat');
    }, 500);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  // Show loading while redirecting
  console.log('🔄 Tabs index - redirecting to chat');
  
  // Try direct redirect first
  return (
    <>
      <Redirect href="/chat" />
      {/* Fallback content in case redirect fails */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ThemedText style={{ color: '#667eea' }}>Redirecting to chat...</ThemedText>
      </View>
    </>
  );
}