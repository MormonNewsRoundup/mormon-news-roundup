export type PurchaseOutcome =
  | { status: 'purchased' }
  | { status: 'restored' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

export type ProductLookup =
  | { status: 'ready'; price: string }
  | { status: 'missing' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

/** Web has no StoreKit. The native module is not imported here. */
export async function lookupRemoveAds(): Promise<ProductLookup> {
  return { status: 'unavailable' };
}

export async function purchaseRemoveAds(): Promise<PurchaseOutcome> {
  return { status: 'unavailable' };
}

export async function restoreRemoveAds(): Promise<PurchaseOutcome> {
  return { status: 'unavailable' };
}
