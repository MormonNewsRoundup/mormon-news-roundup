import { REMOVE_ADS_PRODUCT_ID } from '@/constants/config';
import { canUseIap } from '@/lib/runtime';

export type PurchaseOutcome =
  | { status: 'purchased' }
  | { status: 'restored' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

type LoosePurchase = { productId?: string | null };

type Subscription = { remove: () => void };

type LooseIap = {
  initConnection: () => Promise<unknown>;
  fetchProducts: (request: { skus: string[]; type: 'in-app' }) => Promise<unknown>;
  requestPurchase: (args: {
    request: { apple: { sku: string }; google: { skus: string[] } };
    type: 'in-app';
  }) => Promise<unknown>;
  finishTransaction: (args: { purchase: unknown; isConsumable: boolean }) => Promise<unknown>;
  getAvailablePurchases: () => Promise<LoosePurchase[]>;
  restorePurchases: () => Promise<unknown>;
  purchaseUpdatedListener: (cb: (purchase: LoosePurchase) => void) => Subscription;
  purchaseErrorListener: (cb: (error: { code?: string; message?: string }) => void) => Subscription;
};

/**
 * Loaded only after canUseIap() is true. A top-level import crashes Expo Go
 * because StoreKit is not in that app.
 */
function loadIap(): LooseIap {
  return require('expo-iap') as LooseIap;
}

function isCancelled(error: { code?: string; message?: string }): boolean {
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
  if (!canUseIap()) return { status: 'unavailable' };

  let iap: LooseIap;
  try {
    iap = loadIap();
    await iap.initConnection();
    await iap.fetchProducts({ skus: [REMOVE_ADS_PRODUCT_ID], type: 'in-app' });
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
      if (purchase.productId !== REMOVE_ADS_PRODUCT_ID) return;
      void iap
        .finishTransaction({ purchase, isConsumable: false })
        .then(() => finish({ status: 'purchased' }))
        .catch((error) => finish({ status: 'error', message: messageOf(error) }));
    });

    const failed = iap.purchaseErrorListener((error) => {
      if (isCancelled(error)) {
        finish({ status: 'cancelled' });
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
      .catch((error) => finish({ status: 'error', message: messageOf(error) }));
  });
}

export async function restoreRemoveAds(): Promise<PurchaseOutcome> {
  if (!canUseIap()) return { status: 'unavailable' };

  try {
    const iap = loadIap();
    await iap.initConnection();
    await iap.restorePurchases();
    const purchases = await iap.getAvailablePurchases();
    const found = (purchases ?? []).some((purchase) => purchase.productId === REMOVE_ADS_PRODUCT_ID);
    return found ? { status: 'restored' } : { status: 'not-found' };
  } catch (error) {
    return { status: 'error', message: messageOf(error) };
  }
}
