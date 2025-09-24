// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
          height: 60,
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Voice',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="debug"
        options={{
          title: 'Debug',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bug" size={size} color={color} />
          ),
        }}
      />
      {/* Hide the unused 'two' screen */}
      <Tabs.Screen
        name="two"
        options={{
          href: null, // This hides the tab
        }}
      />
    </Tabs>
  );
}