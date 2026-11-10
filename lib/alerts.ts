import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { getDay, getIndex } from '@/lib/feed';
import type { FeedIndex } from '@/lib/types';

const ENABLED_KEY = 'mnr.alerts.enabled.v1';
const SEEN_KEY = 'mnr.alerts.seen.v1';
const TASK = 'mnr-edition-check';
const CHANNEL = 'editions';

export type AlertChange = { ok: boolean; message?: string };

/**
 * Local alerts only. This app has no server that can store push tokens, so a
 * GitHub Action cannot address a phone. iOS also decides when the background
 * check runs. Opening the app checks immediately.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function markerOf(index: FeedIndex): string {
  return `${index.generatedAt}|${index.pinned?.id ?? ''}`;
}

export async function readAlertsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
}

async function editionBody(index: FeedIndex, previous: string): Promise<string> {
  const pin = index.pinned;
  const previousPin = previous.split('|')[1] ?? '';
  if (pin?.id && pin.id !== previousPin) {
    try {
      const day = await getDay(pin.date, true);
      const item = day.editions.flatMap((edition) => edition.items).find((entry) => entry.id === pin.id);
      if (item?.title) return item.title;
    } catch {
      // Fall through to the newest headline, then a generic line.
    }
  }
  const newest = index.days[0];
  if (newest) {
    try {
      const day = await getDay(newest, true);
      const items = day.editions.flatMap((edition) => edition.items);
      items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      if (items[0]?.title) return items[0].title;
    } catch {
      // The generic line is enough.
    }
  }
  return 'A new edition is in Latest.';
}

export async function maybeNotifyNewEdition(index?: FeedIndex): Promise<void> {
  let current = index;
  if (!current) {
    try {
      current = await getIndex(true);
    } catch {
      return;
    }
  }
  const next = markerOf(current);
  const seen = await AsyncStorage.getItem(SEEN_KEY);
  if (!seen) {
    await AsyncStorage.setItem(SEEN_KEY, next);
    return;
  }
  if (seen === next) return;
  if (await readAlertsEnabled()) {
    const body = await editionBody(current, seen);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mormon News Roundup',
        body,
        sound: true,
        data: { marker: next },
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
  }
  await AsyncStorage.setItem(SEEN_KEY, next);
}

async function registerTask(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  const registered = await TaskManager.isTaskRegisteredAsync(TASK);
  if (!registered) {
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
  }
}

export async function ensureAlertsRegistered(): Promise<void> {
  if (await readAlertsEnabled()) {
    try {
      await registerTask();
    } catch {
      // Opening the app still checks for a new edition.
    }
  }
}

async function baselineSeen(): Promise<void> {
  try {
    const index = await getIndex(false);
    await AsyncStorage.setItem(SEEN_KEY, markerOf(index));
  } catch {
    // The next successful check records the baseline.
  }
}

export async function enableAlerts(): Promise<AlertChange> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'New editions',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') {
    return {
      ok: false,
      message: 'Notifications are off for this app. Turn them on in iOS Settings to get edition alerts.',
    };
  }
  await AsyncStorage.setItem(ENABLED_KEY, '1');
  await baselineSeen();
  try {
    await registerTask();
  } catch {
    // Permission is on. The check still runs when the app opens.
  }
  return { ok: true };
}

export async function disableAlerts(): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, '0');
  try {
    if (await TaskManager.isTaskRegisteredAsync(TASK)) {
      await BackgroundTask.unregisterTaskAsync(TASK);
    }
  } catch {
    // The preference is already off.
  }
}

export function watchNotificationOpens(openLatest: () => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(() => {
    openLatest();
  });
  return () => subscription.remove();
}

TaskManager.defineTask(TASK, async () => {
  try {
    if (!(await readAlertsEnabled())) return BackgroundTask.BackgroundTaskResult.Success;
    await maybeNotifyNewEdition();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
