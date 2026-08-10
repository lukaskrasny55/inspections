import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Generic offline store: `cache` mirrors the last-known JSON body of every GET
// request keyed by its full URL (so /api/inspections and
// /api/inspections?status=draft cache independently, which is the correct
// behaviour). `outbox` is a FIFO queue of mutations made while offline (or
// while a request failed mid-flight), replayed once connectivity returns.
interface OfflineDB extends DBSchema {
  cache: {
    key: string
    value: { url: string; body: unknown; cachedAt: number }
  }
  outbox: {
    key: number
    value: {
      id?: number
      method: 'POST' | 'PATCH' | 'DELETE'
      url: string
      body: unknown
      createdAt: number
      // Set for POSTs that create a record — lets the sync step drop a
      // create+delete pair for a record that was never actually seen by the
      // server, and lets it match/replace optimistic cache entries.
      clientRecordId?: string
    }
  }
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>('tms-hydra-offline', 1, {
      upgrade(db) {
        db.createObjectStore('cache', { keyPath: 'url' })
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
      },
    })
  }
  return dbPromise
}

export async function cacheGet(url: string): Promise<unknown | undefined> {
  const db = await getDb()
  const entry = await db.get('cache', url)
  return entry?.body
}

export async function cacheSet(url: string, body: unknown): Promise<void> {
  const db = await getDb()
  await db.put('cache', { url, body, cachedAt: Date.now() })
}

export async function cacheDelete(url: string): Promise<void> {
  const db = await getDb()
  await db.delete('cache', url)
}

/** Best-effort fallback for list endpoints: exact URL first, then the same
 * path with no query string (a broader cached view is better than nothing). */
export async function cacheGetWithFallback(url: string): Promise<unknown | undefined> {
  const exact = await cacheGet(url)
  if (exact !== undefined) return exact
  const base = url.split('?')[0]
  if (base !== url) return cacheGet(base)
  return undefined
}

export async function outboxAdd(entry: {
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body: unknown
  clientRecordId?: string
}): Promise<void> {
  const db = await getDb()
  await db.add('outbox', { ...entry, createdAt: Date.now() })
}

export async function outboxAll() {
  const db = await getDb()
  return db.getAll('outbox')
}

export async function outboxCount(): Promise<number> {
  const db = await getDb()
  return db.count('outbox')
}

export async function outboxRemove(id: number): Promise<void> {
  const db = await getDb()
  await db.delete('outbox', id)
}
