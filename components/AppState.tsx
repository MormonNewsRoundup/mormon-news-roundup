import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const WELCOME_KEY = 'mnr.welcomeSeen.v1';
const ADS_KEY = 'mnr.adsRemoved.v1';

type AppStateValue = {
  ready: boolean;
  hasSeenWelcome: boolean;
  adsRemoved: boolean;
  markWelcomeSeen: () => Promise<void>;
  replayWelcome: () => Promise<void>;
  setAdsRemoved: (value: boolean) => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [adsRemoved, setAdsRemovedState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [welcome, ads] = await Promise.all([
          AsyncStorage.getItem(WELCOME_KEY),
          AsyncStorage.getItem(ADS_KEY),
        ]);
        if (cancelled) return;
        setHasSeenWelcome(welcome === '1');
        setAdsRemovedState(ads === '1');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markWelcomeSeen = useCallback(async () => {
    setHasSeenWelcome(true);
    await AsyncStorage.setItem(WELCOME_KEY, '1');
  }, []);

  const replayWelcome = useCallback(async () => {
    setHasSeenWelcome(false);
    await AsyncStorage.removeItem(WELCOME_KEY);
  }, []);

  const setAdsRemoved = useCallback(async (value: boolean) => {
    setAdsRemovedState(value);
    if (value) await AsyncStorage.setItem(ADS_KEY, '1');
    else await AsyncStorage.removeItem(ADS_KEY);
  }, []);

  const value = useMemo(
    () => ({ ready, hasSeenWelcome, adsRemoved, markWelcomeSeen, replayWelcome, setAdsRemoved }),
    [ready, hasSeenWelcome, adsRemoved, markWelcomeSeen, replayWelcome, setAdsRemoved],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
