import { withIndexedDbLock } from './indexed-db-lock'

/** Serializes rotations even when Web Locks is unavailable. */
export async function withTabLock<T>(
  name: string,
  shared: boolean,
  task: () => Promise<T>,
): Promise<T> {
  const locks = globalThis.navigator?.locks

  if (locks !== undefined) {
    return locks.request(name, task)
  }

  if (shared) {
    const factory = globalThis.indexedDB

    if (factory === undefined) {
      throw new Error('Session refresh requires browser coordination')
    }

    return withIndexedDbLock(factory, name, task)
  }

  return task()
}
