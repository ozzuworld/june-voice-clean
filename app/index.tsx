import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      router.replace('/(tabs)/chat');
    });
    return () => cancelAnimationFrame(id);
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>June Voice</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)/chat')}>
          <Text style={styles.buttonText}>Go to Chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 16 },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
