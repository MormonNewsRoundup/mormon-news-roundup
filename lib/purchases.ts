import { IAP_ENABLED } from '@/constants/config';
import { canUseIap } from '@/lib/runtime';

export type PurchaseOutcome =
  | { status: 'purchased' }
  | { status: 'restored' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

/**
 * v1 does not ship StoreKit. Both calls refuse without loading expo-iap.
 * The previous purchase flow is in git history. Restore it only after the
 * owner approves the $0.99 purchase, with IAP_ENABLED and the expo-iap
 * package. See the README section "Turning ads and the remove-ads purchase back on".
 */
export async function purchaseRemoveAds(): Promise<PurchaseOutcome> {
  if (!IAP_ENABLED || !canUseIap()) return { status: 'unavailable' };
  return { status: 'unavailable' };
}

export async function restoreRemoveAds(): Promise<PurchaseOutcome> {
  if (!IAP_ENABLED || !canUseIap()) return { status: 'unavailable' };
  return { status: 'unavailable' };
}
