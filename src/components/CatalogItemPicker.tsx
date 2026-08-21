import { useEffect, useMemo, useState } from 'react'
import { createChecklistItemCatalog, fetchChecklistItemCatalog } from '../lib/api'
import type { ChecklistItemCatalog } from '../types'

const UNIT_OPTIONS = ['m', 'm²', 'bm', 'ks']
const RESULT_LIMIT = 25

interface Props {
  // Catalog item ids already added somewhere in this inspection's checklist —
  // hidden from the results so the same item can't be added twice.
  excludeCatalogIds: Set<string>
  onAdd: (catalogItem: ChecklistItemCatalog) => Promise<void>
  buttonLabel?: string
}

// Shared "browse/search the shared catalog, add to this inspection's
// checklist, or create a brand-new catalog item on the fly" picker. Used
// under Technické riešenie as well as Odkvapový systém / Zvody — wherever
// it's mounted, adding an item always writes to the same underlying
// checklist (TechnicalSolutionItem), which is what "Generovať z checklistu"
// reads when building the cenová ponuka. So items added from any of these
// pickers all end up listed together under Technické riešenie — that's
// expected, not a bug.
export default function CatalogItemPicker({ excludeCatalogIds, onAdd, buttonLabel = '+ Pridať z katalógu' }: Props) {
  const [catalog, setCatalog] = useState<ChecklistItemCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (!open) return
    fetchChecklistItemCatalog(true)
      .then(setCatalog)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const available = catalog.filter((c) => !excludeCatalogIds.has(c.id))
    const filtered = q ? available.filter((c) => c.name.toLowerCase().includes(q)) : available
    return filtered.slice(0, RESULT_LIMIT)
  }, [catalog, query, excludeCatalogIds])

  const exactMatchExists = catalog.some((c) => c.name.trim().toLowerCase() === query.trim().toLowerCase())

  async function handleAdd(catalogItem: ChecklistItemCatalog) {
    setAddingId(catalogItem.id)
    setError(null)
    try {
      await onAdd(catalogItem)
      setQuery('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAddingId(null)
    }
  }

  async function handleCreateAndAdd(data: { name: string; unit: string; defaultUnitPrice: number; category: 'material' | 'prace' }) {
    const catalogItem = await createChecklistItemCatalog({ ...data, source: 'custom_added' })
    setCatalog((prev) => (prev.some((c) => c.id === catalogItem.id) ? prev : [...prev, catalogItem]))
    await onAdd(catalogItem)
    setShowAddForm(false)
    setQuery('')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 px-1"
      >
        {buttonLabel}
      </button>
    )
  }

  return (
    <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 space-y-2">
      {error && <div className="text-red-600 dark:text-red-400 text-xs">{error}</div>}
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hľadať v katalógu…"
          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800"
        />
        <button
          onClick={() => {
            setOpen(false)
            setShowAddForm(false)
            setQuery('')
          }}
          className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
        >
          Zavrieť
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 dark:text-slate-500 py-2">Načítavam…</div>
      ) : (
        !showAddForm && (
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {results.length === 0 && (
              <div className="text-sm text-slate-400 dark:text-slate-500 py-2">
                {query.trim() ? 'Nič sa nenašlo.' : 'Katalóg je prázdny.'}
              </div>
            )}
            {results.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.unit} · {c.defaultUnitPrice} €</div>
                </div>
                <button
                  onClick={() => handleAdd(c)}
                  disabled={addingId === c.id}
                  className="text-xs font-medium text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-300 px-3 py-1.5 rounded-md disabled:opacity-50 shrink-0"
                >
                  {addingId === c.id ? '…' : '+ Pridať'}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {!showAddForm && query.trim() && !exactMatchExists && (
        <button
          onClick={() => setShowAddForm(true)}
          className="text-xs font-medium text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 px-1"
        >
          + Vytvoriť novú položku „{query.trim()}" a pridať do katalógu
        </button>
      )}

      {showAddForm && (
        <AddCustomItemForm initialName={query.trim()} onCancel={() => setShowAddForm(false)} onSave={handleCreateAndAdd} />
      )}
    </div>
  )
}

function AddCustomItemForm({
  initialName,
  onCancel,
  onSave,
}: {
  initialName?: string
  onCancel: () => void
  onSave: (data: { name: string; unit: string; defaultUnitPrice: number; category: 'material' | 'prace' }) => Promise<void>
}) {
  const [name, setName] = useState(initialName ?? '')
  const [unit, setUnit] = useState<string>(UNIT_OPTIONS[0])
  const [customUnit, setCustomUnit] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<'material' | 'prace'>('material')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        unit: unit === 'vlastna' ? customUnit.trim() || 'ks' : unit,
        defaultUnitPrice: Number(price) || 0,
        category,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 space-y-2">
      {error && <div className="text-red-600 dark:text-red-400 text-xs">{error}</div>}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Názov položky, napr. Oprava komínového lemovania"
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
          <option value="vlastna">vlastná…</option>
        </select>
        {unit === 'vlastna' && (
          <input
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            placeholder="jednotka"
            className="px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        )}
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Cena/j. (€)"
          className="px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as 'material' | 'prace')}
          className="px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="material">Materiál</option>
          <option value="prace">Práce</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="text-xs font-medium text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {saving ? '…' : 'Uložiť a pridať'}
        </button>
        <button onClick={onCancel} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white">
          Zrušiť
        </button>
      </div>
    </div>
  )
}
