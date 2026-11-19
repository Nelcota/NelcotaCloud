/** Runs `task` while holding a lock shared by every tab of the origin, when the browser has one. */
export async function withTabLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks

  if (locks === undefined) {
    return task()
  }

  return locks.request(name, task)
}
