import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const ADS_KEY = 'mnr.adsRemoved.v1';

type AppStateValue = {
  ready: boolean;
  adsRemoved: boolean;
  setAdsRemoved: (value: boolean) => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [adsRemoved, setAdsRemovedState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ads = await AsyncStorage.getItem(ADS_KEY);
        if (cancelled) return;
        setAdsRemovedState(ads === '1');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAdsRemoved = useCallback(async (value: boolean) => {
    setAdsRemovedState(value);
    if (value) await AsyncStorage.setItem(ADS_KEY, '1');
    else await AsyncStorage.removeItem(ADS_KEY);
  }, []);

  const value = useMemo(
    () => ({ ready, adsRemoved, setAdsRemoved }),
    [ready, adsRemoved, setAdsRemoved],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
