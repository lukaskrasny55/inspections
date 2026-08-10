import { cacheGetWithFallback, cacheSet, outboxAdd, outboxAll, outboxCount, outboxRemove } from './db'

// Fired whenever the outbox changes (queued, drained) so UI can show a live
// "N čaká na synchronizáciu" count without polling.
export const syncEvents = new EventTarget()
function notify() {
  syncEvents.dispatchEvent(new Event('change'))
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Distinguishes "couldn't reach the server" (fetch itself throws / times out)
 * from "the server answered with an error" (e.g. a 400 validation message) —
 * only the former should ever fall back to the offline cache/outbox, so a
 * real validation error still surfaces to the UI exactly as it does online. */
async function rawRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<{ networkFailure: true } | { networkFailure: false; ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const data = await parseJsonSafe(res)
    return { networkFailure: false, ok: res.ok, status: res.status, data }
  } catch {
    return { networkFailure: true }
  } finally {
    clearTimeout(timer)
  }
}

function errorFrom(data: unknown, fallback: string): Error {
  const message = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : undefined
  return new Error(message || fallback)
}

export async function offlineGet<T>(url: string, errorMessage: string, timeoutMs = 5000): Promise<T> {
  const result = await rawRequest('GET', url, undefined, timeoutMs)
  if (!result.networkFailure) {
    if (!result.ok) throw errorFrom(result.data, errorMessage)
    await cacheSet(url, result.data)
    return result.data as T
  }
  const cached = await cacheGetWithFallback(url)
  if (cached !== undefined) return cached as T
  throw new Error(`${errorMessage} (si offline a dáta ešte nie sú uložené v zariadení).`)
}

/**
 * Shared path for POST/PATCH. Always resolves with something the caller can
 * render immediately: the real server response when reachable, or a locally
 * built "optimistic" object (usually just the request body plus its id) when
 * offline — queued in the outbox to replay once connectivity returns.
 */
export async function offlineMutate<T>(
  method: 'POST' | 'PATCH',
  url: string,
  body: Record<string, unknown>,
  buildOptimistic: () => T | Promise<T>,
  timeoutMs = 8000,
): Promise<T> {
  if (navigator.onLine) {
    const result = await rawRequest(method, url, body, timeoutMs)
    if (!result.networkFailure) {
      if (!result.ok) throw errorFrom(result.data, 'Nepodarilo sa uložiť zmeny.')
      return result.data as T
    }
  }
  const clientRecordId = typeof body.id === 'string' ? body.id : undefined
  await outboxAdd({ method, url, body, clientRecordId })
  notify()
  return await buildOptimistic()
}

export async function offlineDelete(url: string, clientRecordId: string | undefined, timeoutMs = 8000): Promise<void> {
  if (navigator.onLine) {
    const result = await rawRequest('DELETE', url, undefined, timeoutMs)
    if (!result.networkFailure) {
      if (!result.ok) throw errorFrom(result.data, 'Nepodarilo sa vymazať záznam.')
      return
    }
  }
  // If this record was itself created offline and never synced, the delete
  // and the create cancel out — the server never needs to hear about either.
  if (clientRecordId) {
    const pending = await outboxAll()
    const unsynced = pending.find((e) => e.method === 'POST' && e.clientRecordId === clientRecordId)
    if (unsynced?.id !== undefined) {
      await outboxRemove(unsynced.id)
      notify()
      return
    }
  }
  await outboxAdd({ method: 'DELETE', url, body: undefined, clientRecordId })
  notify()
}

let draining = false

export async function drainOutbox(): Promise<void> {
  if (draining || !navigator.onLine) return
  draining = true
  try {
    // FIFO: a record created offline must sync before anything that
    // references its (client-generated) id, e.g. a photo on a new inspection.
    let pending = await outboxAll()
    while (pending.length > 0) {
      const entry = pending[0]
      const result = await rawRequest(entry.method, entry.url, entry.body, 15000)
      if (result.networkFailure) break
      if (!result.ok && result.status !== 404) {
        // A real (non-network) failure — stop here so this entry isn't lost
        // and doesn't block reordering; it'll retry on the next sync pass.
        break
      }
      if (entry.id !== undefined) await outboxRemove(entry.id)
      notify()
      pending = pending.slice(1)
    }
  } finally {
    draining = false
  }
}

export async function pendingSyncCount(): Promise<number> {
  return outboxCount()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    drainOutbox()
  })
  if (navigator.onLine) {
    drainOutbox()
  }
}
