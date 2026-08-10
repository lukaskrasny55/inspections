import { useEffect, useState } from 'react'
import { createChecklistItemCatalog, fetchChecklistItemCatalog, updateChecklistItemCatalog } from '../lib/api'
import EditableList from './EditableList'
import type { ChecklistItemCatalog } from '../types'

const CATEGORY_OPTIONS = [
  { value: 'material', label: 'Materiál' },
  { value: 'prace', label: 'Práce' },
  { value: 'ine', label: 'Iné' },
]

const SOURCE_LABELS: Record<string, string> = {
  system_default: 'pôvodná',
  custom_added: 'vlastná',
}

export default function TechnicalSolutionCatalog() {
  const [items, setItems] = useState<ChecklistItemCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChecklistItemCatalog()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Načítavam…</div>

  return (
    <div className="space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <p className="text-sm text-slate-500">
        Položky ponúkané v sekcii „Technické riešenie" checklistu — zaškrtnuté položky sa zapíšu do generovaného
        dokumentu „Návrh technického riešenia". Deaktivovaná položka zmizne z checklistu pre nové obhliadky, staré
        ponuky, ktoré ju použili, zostanú nezmenené.
      </p>
      <EditableList
        columns={[
          { key: 'name', label: 'Názov', placeholder: 'napr. Oprava komínového lemovania' },
          { key: 'unit', label: 'Jednotka', placeholder: 'm / m² / bm / ks' },
          { key: 'defaultUnitPrice', label: 'Cena (€)', type: 'number' },
          { key: 'category', label: 'Kategória', type: 'select', options: CATEGORY_OPTIONS },
          { key: 'isActive', label: 'Aktívna', type: 'checkbox' },
          { key: 'sourceLabel', label: 'Pôvod', type: 'readonly' },
        ]}
        items={items.map((item) => ({ ...item, sourceLabel: SOURCE_LABELS[item.source] ?? item.source }))}
        onCreate={async (draft) => {
          const created = await createChecklistItemCatalog({
            name: String(draft.name || ''),
            unit: String(draft.unit || 'ks'),
            defaultUnitPrice: Number(draft.defaultUnitPrice) || 0,
            category: (draft.category as 'material' | 'prace' | 'ine') || 'material',
          })
          setItems((prev) => [...prev, created])
        }}
        onUpdate={async (id, key, value) => {
          const patch = key === 'defaultUnitPrice' ? { defaultUnitPrice: Number(value) || 0 } : { [key]: value }
          const updated = await updateChecklistItemCatalog(id, patch)
          setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)))
        }}
      />
    </div>
  )
}
