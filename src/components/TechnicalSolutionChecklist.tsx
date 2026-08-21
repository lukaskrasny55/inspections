import { useState } from 'react'
import { createTechnicalSolutionItem, deleteTechnicalSolutionItem, updateTechnicalSolutionItem } from '../lib/api'
import CatalogItemPicker from './CatalogItemPicker'
import type { ChecklistItemCatalog, TechnicalSolutionItem } from '../types'

interface Props {
  inspectionId: string
  items: TechnicalSolutionItem[]
  onChange: (items: TechnicalSolutionItem[]) => void
}

export default function TechnicalSolutionChecklist({ inspectionId, items, onChange }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Riadky checklistu = len položky, ktoré si k tejto zákazke reálne pridal
  // (checklist je prázdny, kým z katalógu niečo nepridáš — z tohto miesta,
  // alebo z pickerov pod Odkvapovým systémom / Zvodmi, sú to všetko tie isté
  // riadky).
  const rows = [...items].sort((a, b) => (a.catalogItem?.name ?? '').localeCompare(b.catalogItem?.name ?? '', 'sk'))
  const addedCatalogIds = new Set(items.map((i) => i.catalogItemId))

  async function handleAddFromCatalog(catalogItem: ChecklistItemCatalog) {
    const created = await createTechnicalSolutionItem({ inspectionId, catalogItemId: catalogItem.id, isChecked: true })
    onChange([...items, { ...created, catalogItem }])
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

  return (
    <div className="space-y-2">
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

      <CatalogItemPicker excludeCatalogIds={addedCatalogIds} onAdd={handleAddFromCatalog} />
    </div>
  )
}
