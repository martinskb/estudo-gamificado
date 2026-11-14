// Arquivos que ficam só neste aparelho (nunca vão para o servidor):
// fotos das capas e as músicas para estudar. IndexedDB, sem dependências.

const DB_NAME = 'lume-device'
const VERSION = 1
export type StoreName = 'covers' | 'tracks'

let opening: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (opening) return opening
  opening = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('covers')) db.createObjectStore('covers')
      if (!db.objectStoreNames.contains('tracks')) db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      opening = null
      reject(req.error ?? new Error('Armazenamento do aparelho indisponível.'))
    }
  })
  return opening
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const req = fn(tx.objectStore(store))
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = () => reject(tx.error ?? new Error('Não deu para salvar no aparelho.'))
        tx.onabort = () => reject(tx.error ?? new Error('Sem espaço no aparelho.'))
      }),
  )
}

export const deviceStore = {
  get: <T>(store: StoreName, key: IDBValidKey) => run<T | undefined>(store, 'readonly', (s) => s.get(key)),
  all: <T>(store: StoreName) => run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>),
  keys: (store: StoreName) => run<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys()),
  put: (store: StoreName, value: unknown, key?: IDBValidKey) => run(store, 'readwrite', (s) => s.put(value, key)),
  remove: (store: StoreName, key: IDBValidKey) => run(store, 'readwrite', (s) => s.delete(key)),
}

/** Pede ao navegador para não apagar estes arquivos quando faltar espaço (nem todo navegador garante). */
export function keepOnDevice(): void {
  void navigator.storage?.persist?.().catch(() => {})
}
