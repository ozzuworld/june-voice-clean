import React from 'react';
import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      
      {/* Hidden index route for navigation */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      
      <Stack.Screen
        name="chat"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}