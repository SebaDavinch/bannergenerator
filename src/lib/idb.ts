/** Minimal promise wrapper over IndexedDB for history records and export blobs. */
const DB = 'banner-studio'
const VERSION = 1
let dbp: Promise<IDBDatabase> | null = null

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbp
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const req = fn(tx.objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

export const idb = {
  all: <T>(store: string) => run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>),
  get: <T>(store: string, key: string) => run<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
  put: (store: string, value: unknown, key?: string) => run(store, 'readwrite', (s) => s.put(value, key)),
  del: (store: string, key: string) => run(store, 'readwrite', (s) => s.delete(key)),
  clear: (store: string) => run(store, 'readwrite', (s) => s.clear()),
}
