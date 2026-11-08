import { IAP_ENABLED, REMOVE_ADS_PRODUCT_ID } from '@/constants/config';
import { canUseIap } from '@/lib/runtime';

export type PurchaseOutcome =
  | { status: 'purchased' }
  | { status: 'restored' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

type StoreRecord = { productId?: string | null; id?: string | null };

type Subscription = { remove: () => void };

type StoreError = { code?: string; message?: string };

type LooseIap = {
  ErrorCode: { AlreadyOwned: string; ItemUnavailable: string; SkuNotFound: string };
  isUserCancelledError: (error: unknown) => boolean;
  initConnection: () => Promise<unknown>;
  fetchProducts: (request: { skus: string[]; type: 'in-app' }) => Promise<StoreRecord[] | null | undefined>;
  requestPurchase: (args: {
    request: { apple: { sku: string }; google: { skus: string[] } };
    type: 'in-app';
  }) => Promise<unknown>;
  finishTransaction: (args: { purchase: unknown; isConsumable: boolean }) => Promise<unknown>;
  getAvailablePurchases: () => Promise<StoreRecord[] | null | undefined>;
  restorePurchases: () => Promise<unknown>;
  purchaseUpdatedListener: (cb: (purchase: StoreRecord) => void) => Subscription;
  purchaseErrorListener: (cb: (error: StoreError) => void) => Subscription;
};

/**
 * Loaded only after canUseIap() is true. A top-level import crashes Expo Go
 * because StoreKit is not in that app. There is no login and no receipt server.
 */
function loadIap(): LooseIap {
  return require('expo-iap') as LooseIap;
}

function recordId(value: StoreRecord | null | undefined): string {
  return value?.productId || value?.id || '';
}

function isCancelled(iap: LooseIap, error: StoreError): boolean {
  if (typeof iap.isUserCancelledError === 'function' && iap.isUserCancelledError(error)) return true;
  const code = String(error.code ?? '').toLowerCase();
  const message = String(error.message ?? '').toLowerCase();
  return code.includes('cancel') || message.includes('cancel');
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Something went wrong talking to the store.';
}

export async function purchaseRemoveAds(): Promise<PurchaseOutcome> {
  if (!IAP_ENABLED || !canUseIap()) return { status: 'unavailable' };

  let iap: LooseIap;
  try {
    iap = loadIap();
    await iap.initConnection();
    const products = await iap.fetchProducts({ skus: [REMOVE_ADS_PRODUCT_ID], type: 'in-app' });
    const listed = (products ?? []).some((product) => recordId(product) === REMOVE_ADS_PRODUCT_ID);
    if (!listed) return { status: 'not-found' };
  } catch (error) {
    return { status: 'error', message: messageOf(error) };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: PurchaseOutcome) => {
      if (settled) return;
      settled = true;
      updated.remove();
      failed.remove();
      resolve(outcome);
    };

    const updated = iap.purchaseUpdatedListener((purchase) => {
      if (recordId(purchase) !== REMOVE_ADS_PRODUCT_ID) return;
      void iap
        .finishTransaction({ purchase, isConsumable: false })
        .then(() => finish({ status: 'purchased' }))
        .catch((error) => finish({ status: 'error', message: messageOf(error) }));
    });

    const failed = iap.purchaseErrorListener((error) => {
      if (isCancelled(iap, error)) {
        finish({ status: 'cancelled' });
        return;
      }
      if (error.code === iap.ErrorCode.AlreadyOwned) {
        finish({ status: 'purchased' });
        return;
      }
      if (error.code === iap.ErrorCode.SkuNotFound || error.code === iap.ErrorCode.ItemUnavailable) {
        finish({ status: 'not-found' });
        return;
      }
      finish({ status: 'error', message: error.message || 'The purchase did not go through.' });
    });

    void iap
      .requestPurchase({
        request: {
          apple: { sku: REMOVE_ADS_PRODUCT_ID },
          google: { skus: [REMOVE_ADS_PRODUCT_ID] },
        },
        type: 'in-app',
      })
      .catch((error: unknown) => {
        const code = typeof error === 'object' && error && 'code' in error ? String((error as StoreError).code ?? '') : '';
        if (isCancelled(iap, (error ?? {}) as StoreError)) {
          finish({ status: 'cancelled' });
          return;
        }
        if (code === iap.ErrorCode.AlreadyOwned) {
          finish({ status: 'purchased' });
          return;
        }
        if (code === iap.ErrorCode.SkuNotFound || code === iap.ErrorCode.ItemUnavailable) {
          finish({ status: 'not-found' });
          return;
        }
        finish({ status: 'error', message: messageOf(error) });
      });
  });
}

export async function restoreRemoveAds(): Promise<PurchaseOutcome> {
  if (!IAP_ENABLED || !canUseIap()) return { status: 'unavailable' };

  try {
    const iap = loadIap();
    await iap.initConnection();
    await iap.restorePurchases();
    const purchases = await iap.getAvailablePurchases();
    const found = (purchases ?? []).some((purchase) => recordId(purchase) === REMOVE_ADS_PRODUCT_ID);
    return found ? { status: 'restored' } : { status: 'not-found' };
  } catch (error) {
    return { status: 'error', message: messageOf(error) };
  }
}
