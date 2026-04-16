import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useUserStore } from '../store/userStore';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  const { token, loadFromStorage } = useUserStore();
  const [appReady, setAppReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadFromStorage().finally(() => setAppReady(true));
  }, []);

  useEffect(() => {
    if (!appReady) return;
    const inAuth = segments[0] === 'auth';
    if (!token && !inAuth) {
      router.replace('/auth/login');
    } else if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [token, appReady]);

  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="camera/PlateMode" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="camera/FridgeMode" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="camera/LabelMode" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="camera/ReceiptMode" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="camera/BarcodeMode" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="diet/RecipeDetail" />
        <Stack.Screen name="diet/DietSelector" />
        <Stack.Screen name="pantry/AddItem" />
      </Stack>
    </>
  );
}
