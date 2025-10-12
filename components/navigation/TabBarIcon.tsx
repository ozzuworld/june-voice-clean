// components/navigation/TabBarIcon.tsx
import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}
