/** Where the SDK keeps the session between page loads (`localStorage`-compatible). */
export type SessionStorageAdapter = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Keeps the session only while the page lives; for servers, tests and private windows. */
export function memoryStorage(): SessionStorageAdapter {
  const items = new Map<string, string>()

  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
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
