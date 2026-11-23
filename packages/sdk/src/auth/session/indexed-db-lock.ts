const DATABASE = 'nelcota-session-coordination'
const STORE = 'refresh'

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE, 1)
    let blocked = false

    request.addEventListener('upgradeneeded', () => request.result.createObjectStore(STORE), {
      once: true,
    })
    request.addEventListener('error', () => reject(request.error), { once: true })
    request.addEventListener(
      'blocked',
      () => {
        blocked = true
        reject(new Error('Session refresh coordination is blocked'))
      },
      { once: true },
    )
    request.addEventListener(
      'success',
      () => {
        const database = request.result

        if (blocked) {
          database.close()
          return
        }

        resolve(database)
      },
      { once: true },
    )
  })
}

/** A read/write transaction gives this origin an exclusive slot without storing credentials. */
export async function withIndexedDbLock<T>(
  factory: IDBFactory,
  name: string,
  task: () => Promise<T>,
): Promise<T> {
  const database = await openDatabase(factory)

  try {
    return await runInTransaction(database, name, task)
  } finally {
    database.close()
  }
}

function runInTransaction<T>(
  database: IDBDatabase,
  name: string,
  task: () => Promise<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    let completion: (() => void) | undefined
    let started = false

    transaction.addEventListener(
      'abort',
      () => {
        reject(transaction.error ?? new Error('Session refresh coordination was interrupted'))
      },
      { once: true },
    )
    transaction.addEventListener('complete', () => completion?.(), { once: true })

    function waitForRefresh(): void {
      const read = store.get(name)
      read.addEventListener(
        'success',
        () => {
          if (started === false) {
            started = true
            void Promise.resolve()
              .then(task)
              .then(
                (result) => {
                  completion = () => resolve(result)
                },
                (error: unknown) => {
                  completion = () => reject(error)
                },
              )
          }

          // Continue from the active request callback so the transaction stays open until the
          // rotated session has been written to storage.
          if (completion === undefined) {
            waitForRefresh()
          }
        },
        { once: true },
      )
    }

    waitForRefresh()
  })
}
