// app/(auth)/login.tsx
import { View, Text, Button } from 'react-native';
import { useAuth } from '../../hooks/useAuth'; // ← two dots, NO “.min”

export default function Login() {
  const { signIn } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 18 }}>Sign in to continue</Text>
      <Button title="Sign in" onPress={signIn} />
    </View>
  );
}
