// app/index.tsx — DETAILED DEBUG VERSION
import { View, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ThemedText } from '@/components/ThemedText';
import { useEffect, useState, useRef } from 'react';

export default function Index() {
  // Debug: Track component lifecycle
  const componentId = useRef(`idx_${Math.random().toString(36).substr(2, 9)}`).current;
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`📱 Index component render #${renderCount.current} (ID: ${componentId})`);

  // Get auth state
  const authContext = useAuth();
  const { isAuthenticated, isLoading, user, accessToken, contextId } = authContext;
  const router = useRouter();
  
  // Track navigation state
  const [navigationAttempts, setNavigationAttempts] = useState(0);
  const [lastNavigationTime, setLastNavigationTime] = useState<number | null>(null);
  
  // Log auth context info
  console.log(`🔗 Index using auth context: ${contextId} (Index ID: ${componentId})`);

  // Debug logging with component ID
  useEffect(() => {
    console.log(`🔍 Index (${componentId}) - Auth state from context (${contextId}):`, {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      hasToken: !!accessToken,
      userEmail: user?.email,
      renderCount: renderCount.current,
    });
  }, [isAuthenticated, isLoading, user, accessToken, componentId, contextId]);

  // Handle navigation when authenticated
  useEffect(() => {
    console.log(`🧭 Navigation effect (${componentId}) - State check:`, {
      isAuthenticated,
      isLoading,
      navigationAttempts,
    });

    if (isAuthenticated && !isLoading) {
      const now = Date.now();
      const timeSinceLastNav = lastNavigationTime ? now - lastNavigationTime : Infinity;

      // Prevent rapid repeated navigation attempts
      if (timeSinceLastNav > 1000) { // 1 second cooldown
        console.log(`🚀 Index (${componentId}) attempting navigation to chat (attempt #${navigationAttempts + 1})`);
        
        setNavigationAttempts(prev => prev + 1);
        setLastNavigationTime(now);
        
        try {
          router.replace('/(tabs)/chat');
          console.log(`✅ Navigation initiated (${componentId})`);
        } catch (error) {
          console.error(`❌ Navigation failed (${componentId}):`, error);
        }
      } else {
        console.log(`⏳ Navigation cooldown active (${componentId}) - ${1000 - timeSinceLastNav}ms remaining`);
      }
    }
  }, [isAuthenticated, isLoading, componentId, navigationAttempts, lastNavigationTime, router]);

  // Monitor component mounting/unmounting
  useEffect(() => {
    console.log(`🎬 Index component (${componentId}) mounted`);
    
    return () => {
      console.log(`🎬 Index component (${componentId}) unmounting`);
    };
  }, [componentId]);

  // Monitor auth context changes
  useEffect(() => {
    console.log(`🔄 Index (${componentId}) detected auth context change: ${contextId}`);
  }, [contextId, componentId]);

  // Show loading screen while checking auth
  if (isLoading) {
    console.log(`⏳ Index (${componentId}) showing loading screen...`);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ThemedText style={{ fontSize: 32, marginBottom: 20, color: '#fff' }}>OZZU</ThemedText>
        <ActivityIndicator size="large" color="#667eea" />
        <ThemedText style={{ fontSize: 14, color: '#666', marginTop: 10 }}>
          Checking authentication... 
        </ThemedText>
        <ThemedText style={{ fontSize: 12, color: '#444', marginTop: 5 }}>
          Component: {componentId.substring(0, 8)}
        </ThemedText>
        <ThemedText style={{ fontSize: 12, color: '#444' }}>
          Context: {contextId?.substring(0, 8)}
        </ThemedText>
        <ThemedText style={{ fontSize: 12, color: '#444' }}>
          Render: #{renderCount.current}
        </ThemedText>
      </View>
    );
  }
  
  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log(`❌ Index (${componentId}) not authenticated, redirecting to login...`);
    return <Redirect href="/(auth)/login" />;
  }
  
  // Authenticated - should navigate or redirect
  console.log(`✅ Index (${componentId}) authenticated, should redirect to chat... (attempts: ${navigationAttempts})`);
  
  // Show a brief loading state while navigation happens
  if (navigationAttempts > 0 && navigationAttempts < 3) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ThemedText style={{ fontSize: 32, marginBottom: 20, color: '#fff' }}>OZZU</ThemedText>
        <ActivityIndicator size="large" color="#667eea" />
        <ThemedText style={{ fontSize: 14, color: '#666', marginTop: 10 }}>
          Navigating to chat...
        </ThemedText>
        <ThemedText style={{ fontSize: 12, color: '#444', marginTop: 5 }}>
          Attempt #{navigationAttempts}
        </ThemedText>
      </View>
    );
  }
  
  // Fallback redirect if navigation hasn't worked
  console.log(`🔄 Index (${componentId}) fallback redirect (${navigationAttempts} attempts failed)`);
  return <Redirect href="/(tabs)/chat" />;
}