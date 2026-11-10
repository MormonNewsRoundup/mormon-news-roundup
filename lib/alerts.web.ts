export type AlertChange = { ok: boolean; message?: string };

export async function readAlertsEnabled(): Promise<boolean> {
  return false;
}

export async function maybeNotifyNewEdition(_index?: unknown): Promise<void> {}

export async function ensureAlertsRegistered(): Promise<void> {}

export async function enableAlerts(): Promise<AlertChange> {
  return {
    ok: false,
    message: 'Edition alerts are delivered on the iPhone app. This preview cannot send them.',
  };
}

export async function disableAlerts(): Promise<void> {}

export function watchNotificationOpens(_openLatest: () => void): () => void {
  return () => undefined;
}
