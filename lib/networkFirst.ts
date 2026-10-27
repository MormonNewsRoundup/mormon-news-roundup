/**
 * Try the network, then a saved copy, then a bundled sample.
 * A saved copy is never returned while the network can answer.
 */
export async function networkFirst<T>(
  fetchFresh: () => Promise<T>,
  readCached: () => Promise<T | null>,
  bundled: () => T | null,
): Promise<T> {
  try {
    return await fetchFresh();
  } catch (error) {
    const cached = await readCached();
    if (cached != null) return cached;
    const sample = bundled();
    if (sample != null) return sample;
    throw error;
  }
}
