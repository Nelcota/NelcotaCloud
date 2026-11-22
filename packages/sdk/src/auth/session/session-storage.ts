/** Where the SDK keeps the session between page loads (`localStorage`-compatible). */
export type SessionStorageAdapter = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  readonly length?: number
  key?(index: number): string | null
}

const memoryAdapters = new WeakSet<SessionStorageAdapter>()

export function sharedBrowserStorage(storage: SessionStorageAdapter): boolean {
  return typeof globalThis.document !== 'undefined' && memoryAdapters.has(storage) === false
}

/** Keeps the session only while the page lives; for servers, tests and private windows. */
export function memoryStorage(): SessionStorageAdapter {
  const items = new Map<string, string>()

  const storage: SessionStorageAdapter = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }

  memoryAdapters.add(storage)

  return storage
}

/** `localStorage` in browsers that allow it; memory everywhere else. */
export function defaultStorage(): SessionStorageAdapter {
  try {
    const storage = globalThis.localStorage
    const probeKey = '__nelcota_probe__'
    storage.setItem(probeKey, probeKey)
    storage.removeItem(probeKey)

    return storage
  } catch {
    return memoryStorage()
  }
}
