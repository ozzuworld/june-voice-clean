import React from 'react';
import { Tabs } from 'expo-router';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#666',
      }}>
      
      {/* Hidden index route for navigation */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Voice Chat',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="microphone" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}