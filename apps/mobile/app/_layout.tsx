import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.text,
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: Colors.background },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(auth)/login"
              options={{
                title: 'Giris Yap',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="(auth)/register"
              options={{
                title: 'Kayit Ol',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="(auth)/verify"
              options={{
                title: 'Dogrulama',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="auction/[id]"
              options={{
                title: '',
                headerTransparent: true,
              }}
            />
            <Stack.Screen
              name="product/[id]"
              options={{
                title: 'Urun Detayi',
              }}
            />
            <Stack.Screen
              name="my-bids"
              options={{ title: 'Tekliflerim' }}
            />
            <Stack.Screen
              name="my-orders"
              options={{ title: 'Siparislerim' }}
            />
            <Stack.Screen
              name="favorites"
              options={{ title: 'Favorilerim' }}
            />
            <Stack.Screen
              name="live/[id]"
              options={{
                title: '',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="checkout/[orderId]"
              options={{
                title: 'Odeme',
              }}
            />
            <Stack.Screen
              name="order/[id]"
              options={{
                title: 'Siparis Detayi',
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                title: 'Ayarlar',
              }}
            />
          </Stack>
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
