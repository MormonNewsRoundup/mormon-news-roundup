import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import 'react-native-reanimated';

import { AppStateProvider, useAppState } from '@/components/AppState';
import { useColorScheme } from '@/components/useColorScheme';
import { useTheme } from '@/components/useTheme';
import { watchNotificationOpens } from '@/lib/alerts';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppStateProvider>
      <RootGate />
    </AppStateProvider>
  );
}

function RootGate() {
  const { ready } = useAppState();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const column = width >= 768 ? Math.min(width, 760) : 480;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    return watchNotificationOpens(() => {
      router.navigate('/' as Href);
    });
  }, []);

  if (!ready) return null;

  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <View style={{ flex: 1, backgroundColor: theme.frame, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: column, backgroundColor: theme.background }}>
        <StatusBar style="light" />
        <ThemeProvider
          value={{
            ...navigationTheme,
            colors: {
              ...navigationTheme.colors,
              background: theme.background,
              card: theme.tabBar,
              text: theme.text,
              border: theme.border,
              primary: theme.tabActive,
            },
          }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="story/[id]" options={{ headerShown: false, presentation: 'card' }} />
          </Stack>
        </ThemeProvider>
      </View>
    </View>
  );
}
