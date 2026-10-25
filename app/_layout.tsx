import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AppStateProvider, useAppState } from '@/components/AppState';
import { useColorScheme } from '@/components/useColorScheme';
import { useTheme } from '@/components/useTheme';
import { WelcomeScreen } from '@/components/WelcomeScreen';

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
  const { ready, hasSeenWelcome, markWelcomeSeen } = useAppState();
  const theme = useTheme();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <View style={{ flex: 1, backgroundColor: theme.frame, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: theme.background }}>
        <StatusBar style="light" />
        {hasSeenWelcome ? (
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
            </Stack>
          </ThemeProvider>
        ) : (
          <WelcomeScreen onContinue={() => void markWelcomeSeen()} />
        )}
      </View>
    </View>
  );
}
