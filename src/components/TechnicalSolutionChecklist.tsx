import { useEffect, useState } from 'react'
import {
  createChecklistItemCatalog,
  createTechnicalSolutionItem,
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

export default function TechnicalSolutionChecklist({ inspectionId, items, onChange }: Props) {
  const [catalog, setCatalog] = useState<ChecklistItemCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyCatalogId, setBusyCatalogId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchChecklistItemCatalog(true)
      .then(setCatalog)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Rows shown = every active catalog item, plus any catalog item this
  // inspection already references even if it was since deactivated — a
  // deactivated item must not disappear from an inspection that already used it.
  const referencedInactive = items
    .map((item) => item.catalogItem)
    .filter((catalogItem) => catalogItem && !catalog.some((c) => c.id === catalogItem.id))
  const rows = [...catalog, ...referencedInactive].sort((a, b) => a.name.localeCompare(b.name, 'sk'))

  function itemFor(catalogItemId: string) {
    return items.find((i) => i.catalogItemId === catalogItemId)
  }

  async function handleToggle(catalogItem: ChecklistItemCatalog, checked: boolean) {
    setBusyCatalogId(catalogItem.id)
    setError(null)
    try {
      const existing = itemFor(catalogItem.id)
      if (existing) {
        const updated = await updateTechnicalSolutionItem(existing.id, { isChecked: checked })
        onChange(items.map((i) => (i.id === existing.id ? { ...i, ...updated } : i)))
      } else {
        const created = await createTechnicalSolutionItem({ inspectionId, catalogItemId: catalogItem.id, isChecked: checked })
        onChange([...items, { ...created, catalogItem }])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyCatalogId(null)
    }
  }

  async function handleValueBlur(catalogItem: ChecklistItemCatalog, value: string) {
    const existing = itemFor(catalogItem.id)
    if (existing && (existing.valueNumber ?? '') === value) return
    const parsed = value === '' ? undefined : Number(value)
    if (parsed !== undefined && Number.isNaN(parsed)) return
    setBusyCatalogId(catalogItem.id)
    setError(null)
    try {
      if (existing) {
        const updated = await updateTechnicalSolutionItem(existing.id, { valueNumber: parsed ?? null })
        onChange(items.map((i) => (i.id === existing.id ? { ...i, ...updated } : i)))
      } else {
        const created = await createTechnicalSolutionItem({ inspectionId, catalogItemId: catalogItem.id, isChecked: false, valueNumber: parsed })
        onChange([...items, { ...created, catalogItem }])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyCatalogId(null)
    }
  }

  async function handleNotesBlur(catalogItem: ChecklistItemCatalog, value: string) {
    const existing = itemFor(catalogItem.id)
    if (existing && (existing.notes ?? '') === value) return
    setBusyCatalogId(catalogItem.id)
    setError(null)
    try {
      if (existing) {
        const updated = await updateTechnicalSolutionItem(existing.id, { notes: value || null })
        onChange(items.map((i) => (i.id === existing.id ? { ...i, ...updated } : i)))
      } else {
        const created = await createTechnicalSolutionItem({ inspectionId, catalogItemId: catalogItem.id, isChecked: false, notes: value })
        onChange([...items, { ...created, catalogItem }])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyCatalogId(null)
    }
  }

  async function handleAddCustomItem(data: { name: string; unit: string; defaultUnitPrice: number; category: 'material' | 'prace' }) {
    const newCatalogItem = await createChecklistItemCatalog({ ...data, source: 'custom_added' })
    setCatalog((prev) => [...prev, newCatalogItem])
    const created = await createTechnicalSolutionItem({ inspectionId, catalogItemId: newCatalogItem.id, isChecked: true })
    onChange([...items, { ...created, catalogItem: newCatalogItem }])
    setShowAddForm(false)
  }

  if (loading) return <div className="text-slate-500 text-sm">Načítavam…</div>

  return (
    <div className="space-y-2">
      {error && <div className="text-red-600 text-xs">{error}</div>}

      {rows.length === 0 && !showAddForm && (
        <div className="text-slate-400 text-sm">Zatiaľ žiadne položky. Pridaj prvú nižšie.</div>
      )}

      {rows.map((catalogItem) => {
        const item = itemFor(catalogItem.id)
        const busy = busyCatalogId === catalogItem.id
        return (
          <div key={catalogItem.id} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <input
              type="checkbox"
              checked={Boolean(item?.isChecked)}
              disabled={busy}
              onChange={(e) => handleToggle(catalogItem, e.target.checked)}
              className="w-4 h-4 mt-1 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-sm font-medium text-slate-700">
                {catalogItem.name}
                <span className="ml-2 text-xs text-slate-400 font-normal">
                  {catalogItem.unit} · {catalogItem.defaultUnitPrice} € {!catalogItem.isActive && '· neaktívna'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  defaultValue={item?.valueNumber ?? ''}
                  onBlur={(e) => handleValueBlur(catalogItem, e.target.value)}
                  disabled={busy}
                  placeholder="Hodnota"
                  className="w-32 px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded text-sm focus:outline-none bg-white"
                />
                <span className="text-xs text-slate-400">{catalogItem.unit}</span>
              </div>
              <input
                defaultValue={item?.notes ?? ''}
                onBlur={(e) => handleNotesBlur(catalogItem, e.target.value)}
                disabled={busy}
                placeholder="Poznámka"
                className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded text-sm focus:outline-none bg-white"
              />
            </div>
          </div>
        )
      })}

      {showAddForm ? (
        <AddCustomItemForm onCancel={() => setShowAddForm(false)} onSave={handleAddCustomItem} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="text-xs font-medium text-brand-600 hover:text-brand-700 px-1"
        >
          + Pridať vlastnú položku
        </button>
      )}
    </div>
  )
}

function AddCustomItemForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: (data: { name: string; unit: string; defaultUnitPrice: number; category: 'material' | 'prace' }) => Promise<void>
}) {
  const [name, setName] = useState('')
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
    <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
      {error && <div className="text-red-600 text-xs">{error}</div>}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Názov položky, napr. Oprava komínového lemovania"
        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="px-2 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="px-2 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        )}
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Cena/j. (€)"
          className="px-2 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as 'material' | 'prace')}
          className="px-2 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="material">Materiál</option>
          <option value="prace">Práce</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="text-xs font-medium text-white bg-slate-900 px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {saving ? '…' : 'Uložiť'}
        </button>
        <button onClick={onCancel} className="text-xs font-medium text-slate-500 hover:text-slate-700">
          Zrušiť
        </button>
      </div>
    </div>
  )
}
