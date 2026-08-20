import { useEffect, useMemo, useState } from 'react'
import {
  createChecklistItemCatalog,
  createTechnicalSolutionItem,
  deleteTechnicalSolutionItem,
  fetchChecklistItemCatalog,
  updateTechnicalSolutionItem,
} from '../lib/api'
import type { ChecklistItemCatalog, TechnicalSolutionItem } from '../types'

interface Props {
  inspectionId: string
  items: TechnicalSolutionItem[]
  onChange: (items: TechnicalSolutionItem[]) => void
}

const UNIT_OPTIONS = ['m', 'm²', 'bm', 'ks']
const PICKER_RESULT_LIMIT = 25

export default function TechnicalSolutionChecklist({ inspectionId, items, onChange }: Props) {
  const [catalog, setCatalog] = useState<ChecklistItemCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [query, setQuery] = useState('')
  const [addingCatalogId, setAddingCatalogId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchChecklistItemCatalog(true)
      .then(setCatalog)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Riadky checklistu = len položky, ktoré si k tejto zákazke reálne pridal
  // (checklist je teraz prázdny, kým z katalógu niečo nepridáš). Katalógová
  // položka môže medzičasom zaniknúť (deaktivovať) — ak ju táto obhliadka
  // už použila, aj tak zostane vidno.
  const rows = [...items].sort((a, b) => (a.catalogItem?.name ?? '').localeCompare(b.catalogItem?.name ?? '', 'sk'))
  const addedCatalogIds = new Set(items.map((i) => i.catalogItemId))

  const pickerResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    const available = catalog.filter((c) => !addedCatalogIds.has(c.id))
    const filtered = q ? available.filter((c) => c.name.toLowerCase().includes(q)) : available
    return filtered.slice(0, PICKER_RESULT_LIMIT)
  }, [catalog, query, items])

  const exactMatchExists = catalog.some((c) => c.name.trim().toLowerCase() === query.trim().toLowerCase())

  async function handleAddFromCatalog(catalogItem: ChecklistItemCatalog) {
    setAddingCatalogId(catalogItem.id)
    setError(null)
    try {
      const created = await createTechnicalSolutionItem({ inspectionId, catalogItemId: catalogItem.id, isChecked: true })
      onChange([...items, { ...created, catalogItem }])
      setQuery('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAddingCatalogId(null)
    }
  }

  async function handleRemove(item: TechnicalSolutionItem) {
    setBusyId(item.id)
    setError(null)
    try {
      await deleteTechnicalSolutionItem(item.id)
      onChange(items.filter((i) => i.id !== item.id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleValueBlur(item: TechnicalSolutionItem, value: string) {
    if ((item.valueNumber ?? '') === value) return
    const parsed = value === '' ? null : Number(value)
    if (parsed !== null && Number.isNaN(parsed)) return
    setBusyId(item.id)
    setError(null)
    try {
      const updated = await updateTechnicalSolutionItem(item.id, { valueNumber: parsed })
      onChange(items.map((i) => (i.id === item.id ? { ...i, ...updated } : i)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleNotesBlur(item: TechnicalSolutionItem, value: string) {
    if ((item.notes ?? '') === value) return
    setBusyId(item.id)
    setError(null)
    try {
      const updated = await updateTechnicalSolutionItem(item.id, { notes: value || null })
      onChange(items.map((i) => (i.id === item.id ? { ...i, ...updated } : i)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  // Vytvorenie novej položky v katalógu je trvalé (zostane tam pre všetky
  // budúce zákazky) — server pri zhodnom názve vráti existujúcu položku
  // namiesto duplicity, takže sem sa dostaneme len raz na skutočne nový názov.
  async function handleCreateAndAdd(data: { name: string; unit: string; defaultUnitPrice: number; category: 'material' | 'prace' }) {
    const catalogItem = await createChecklistItemCatalog({ ...data, source: 'custom_added' })
    setCatalog((prev) => (prev.some((c) => c.id === catalogItem.id) ? prev : [...prev, catalogItem]))
    const created = await createTechnicalSolutionItem({ inspectionId, catalogItemId: catalogItem.id, isChecked: true })
    onChange([...items, { ...created, catalogItem }])
    setShowAddForm(false)
    setQuery('')
  }

  if (loading) return <div className="text-slate-500 dark:text-slate-400 text-sm">Načítavam…</div>

  return (
    <div className="space-y-3">
      {error && <div className="text-red-600 dark:text-red-400 text-xs">{error}</div>}

      {rows.length === 0 && (
        <div className="text-slate-400 dark:text-slate-500 text-sm">
          Zatiaľ žiadne položky. Pridaj ich z katalógu tlačidlom nižšie.
        </div>
      )}

      {rows.map((item) => {
        const catalogItem = item.catalogItem
        const busy = busyId === item.id
        return (
          <div key={item.id} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {catalogItem?.name ?? '—'}
                <span className="ml-2 text-xs text-slate-400 font-normal">
                  {catalogItem?.unit} · {catalogItem?.defaultUnitPrice} € {catalogItem && !catalogItem.isActive && '· neaktívna'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  defaultValue={item.valueNumber ?? ''}
                  onBlur={(e) => handleValueBlur(item, e.target.value)}
                  disabled={busy}
                  placeholder="Hodnota / množstvo"
                  className="w-32 px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded text-sm focus:outline-none bg-white dark:bg-slate-800"
                />
                <span className="text-xs text-slate-400">{catalogItem?.unit}</span>
              </div>
              <input
                defaultValue={item.notes ?? ''}
                onBlur={(e) => handleNotesBlur(item, e.target.value)}
                disabled={busy}
                placeholder="Poznámka"
                className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded text-sm focus:outline-none bg-white dark:bg-slate-800"
              />
            </div>
            <button
              onClick={() => handleRemove(item)}
              disabled={busy}
              className="text-slate-400 hover:text-red-600 shrink-0"
              title="Odstrániť z checklistu tejto zákazky"
            >
              ×
            </button>
          </div>
        )
      })}

      {showPicker ? (
        <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 space-y-2">
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
                setShowPicker(false)
                setShowAddForm(false)
                setQuery('')
              }}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
            >
              Zavrieť
            </button>
          </div>

          {!showAddForm && (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {pickerResults.length === 0 && (
                <div className="text-sm text-slate-400 dark:text-slate-500 py-2">
                  {query.trim() ? 'Nič sa nenašlo.' : 'Katalóg je prázdny.'}
                </div>
              )}
              {pickerResults.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.unit} · {c.defaultUnitPrice} €</div>
                  </div>
                  <button
                    onClick={() => handleAddFromCatalog(c)}
                    disabled={addingCatalogId === c.id}
                    className="text-xs font-medium text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-300 px-3 py-1.5 rounded-md disabled:opacity-50 shrink-0"
                  >
                    {addingCatalogId === c.id ? '…' : '+ Pridať'}
                  </button>
                </div>
              ))}
            </div>
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
            <AddCustomItemForm
              initialName={query.trim()}
              onCancel={() => setShowAddForm(false)}
              onSave={handleCreateAndAdd}
            />
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs font-medium text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 px-1"
        >
          + Pridať z katalógu
        </button>
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
