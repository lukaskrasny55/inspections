import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createInspection, fetchInspections } from '../lib/api'
import { cacheGetWithFallback, cacheSet } from '../lib/db'
import SyncStatus from '../components/SyncStatus'
import { STATUS_LABELS, type InspectionListItem, type InspectionStatus } from '../types'

const FILTERS: { label: string; value: InspectionStatus | 'all' }[] = [
  { label: 'Všetky', value: 'all' },
  { label: STATUS_LABELS.draft, value: 'draft' },
  { label: STATUS_LABELS.ready_for_quote, value: 'ready_for_quote' },
  { label: STATUS_LABELS.sent, value: 'sent' },
]

export default function InspectionsListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<InspectionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<InspectionStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchInspections({ status: filter === 'all' ? undefined : filter, q: search || undefined })
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filter, search])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const inspection = await createInspection({ customerName: newName.trim() })
      // So the list still shows this zákazka if the user browses back while
      // still offline, before it's had a chance to sync to the server.
      const cachedList = ((await cacheGetWithFallback('/api/inspections?')) as InspectionListItem[] | undefined) ?? []
      await cacheSet('/api/inspections?', [inspection, ...cachedList])
      navigate(`/inspections/${inspection.id}`)
    } catch (err) {
      setError((err as Error).message)
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">TMS Hydra – Obhliadky</h1>
        <div className="flex items-center gap-3">
        <SyncStatus />
        <div className="flex items-center gap-1">
        <Link to="/plan" className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100">
          Plán
        </Link>
        <Link to="/summary" className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100">
          Súhrn
        </Link>
        <Link to="/navod" className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100">
          Návod
        </Link>
        <details className="relative">
          <summary className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer list-none px-3 py-1.5 rounded-md hover:bg-slate-100">
            Nastavenia ▾
          </summary>
          <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10">
            <Link to="/settings/katalog" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Katalóg
            </Link>
            <Link to="/settings/technicians" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Technici
            </Link>
            <Link to="/settings/material-compositions" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Materiálové skladby
            </Link>
            <Link to="/settings/material-products" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Popisy materiálov
            </Link>
            <Link to="/settings/document-templates" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Textové šablóny
            </Link>
            <Link to="/settings/company" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Firemné údaje
            </Link>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => {
                fetch('/api/session-logout', { method: 'POST' }).finally(() => window.location.reload())
              }}
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Odhlásiť sa
            </button>
          </div>
        </details>
        </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  filter === f.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
          >
            + Nová zákazka
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Meno zákazníka</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="napr. Ján Novák"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
            >
              {creating ? 'Vytváram…' : 'Založiť'}
            </button>
          </form>
        )}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať podľa mena zákazníka…"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {loading ? (
          <div className="text-slate-500 text-sm py-8 text-center">Načítavam…</div>
        ) : items.length === 0 ? (
          <div className="text-slate-500 text-sm py-12 text-center">
            Žiadne zákazky. Založ prvú tlačidlom vyššie.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/inspections/${item.id}`)}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <div className="font-medium text-slate-900">{item.customer.name}</div>
                  <div className="text-sm text-slate-500">
                    {item.referenceNumber}
                    {item.customer.address ? ` · ${item.customer.address}` : ''}
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {STATUS_LABELS[item.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
