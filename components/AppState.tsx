import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { disableAlerts, enableAlerts, ensureAlertsRegistered, readAlertsEnabled } from '@/lib/alerts';
import { rememberStory } from '@/lib/stories';
import { parseTextSize, type TextSize } from '@/lib/textSize';
import type { FeedItem } from '@/lib/types';
import { tell } from '@/lib/notice';

const ADS_KEY = 'mnr.adsRemoved.v1';
const SAVED_KEY = 'mnr.saved.v1';
const TEXT_KEY = 'mnr.textSize.v1';

type SavedRecord = { savedAt: string; item: FeedItem };

type AppStateValue = {
  ready: boolean;
  adsRemoved: boolean;
  setAdsRemoved: (value: boolean) => Promise<void>;
  saved: SavedRecord[];
  isSaved: (id: string) => boolean;
  toggleSaved: (item: FeedItem) => Promise<void>;
  textSize: TextSize;
  setTextSize: (value: TextSize) => Promise<void>;
  alertsEnabled: boolean;
  setAlertsEnabled: (value: boolean) => Promise<boolean>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function parseSaved(raw: string | null): SavedRecord[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is SavedRecord => {
      if (!entry || typeof entry !== 'object') return false;
      const record = entry as SavedRecord;
      return (
        typeof record.savedAt === 'string' &&
        Boolean(record.item) &&
        typeof record.item.id === 'string' &&
        typeof record.item.title === 'string' &&
        typeof record.item.url === 'string'
      );
    });
  } catch {
    return [];
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [adsRemoved, setAdsRemovedState] = useState(false);
  const [saved, setSaved] = useState<SavedRecord[]>([]);
  const [textSize, setTextSizeState] = useState<TextSize>('default');
  const [alertsEnabled, setAlertsEnabledState] = useState(false);
  const savedRef = useRef<SavedRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [ads, savedRaw, text, alerts] = await Promise.all([
          AsyncStorage.getItem(ADS_KEY),
          AsyncStorage.getItem(SAVED_KEY),
          AsyncStorage.getItem(TEXT_KEY),
          readAlertsEnabled(),
        ]);
        if (cancelled) return;
        const records = parseSaved(savedRaw);
        for (const record of records) rememberStory(record.item);
        savedRef.current = records;
        setAdsRemovedState(ads === '1');
        setSaved(records);
        setTextSizeState(parseTextSize(text));
        setAlertsEnabledState(alerts);
        if (alerts) void ensureAlertsRegistered();
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

  const toggleSaved = useCallback(async (item: FeedItem) => {
    rememberStory(item);
    const exists = savedRef.current.some((record) => record.item.id === item.id);
    const next = exists
      ? savedRef.current.filter((record) => record.item.id !== item.id)
      : [{ savedAt: new Date().toISOString(), item }, ...savedRef.current];
    savedRef.current = next;
    setSaved(next);
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next));
  }, []);

  const isSaved = useCallback((id: string) => saved.some((record) => record.item.id === id), [saved]);

  const setTextSize = useCallback(async (value: TextSize) => {
    setTextSizeState(value);
    await AsyncStorage.setItem(TEXT_KEY, value);
  }, []);

  const setAlertsEnabled = useCallback(async (value: boolean) => {
    if (value) {
      const result = await enableAlerts();
      if (!result.ok) {
        setAlertsEnabledState(false);
        if (result.message) tell('Alerts stay off', result.message);
        return false;
      }
      setAlertsEnabledState(true);
      return true;
    }
    await disableAlerts();
    setAlertsEnabledState(false);
    return true;
  }, []);

  const value = useMemo(
    () => ({
      ready,
      adsRemoved,
      setAdsRemoved,
      saved,
      isSaved,
      toggleSaved,
      textSize,
      setTextSize,
      alertsEnabled,
      setAlertsEnabled,
    }),
    [
      ready,
      adsRemoved,
      setAdsRemoved,
      saved,
      isSaved,
      toggleSaved,
      textSize,
      setTextSize,
      alertsEnabled,
      setAlertsEnabled,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
