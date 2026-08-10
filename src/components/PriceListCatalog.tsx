import { useEffect, useState } from 'react'
import { createPriceListItem, deletePriceListItem, fetchPriceList, updatePriceListItem } from '../lib/api'
import EditableList from './EditableList'
import type { PriceListItem } from '../types'

const CATEGORY_OPTIONS = [
  { value: 'material', label: 'Materiál' },
  { value: 'prace', label: 'Práce' },
]

export default function PriceListCatalog() {
  const [items, setItems] = useState<PriceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPriceList()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Načítavam…</div>

  return (
    <div className="space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <p className="text-sm text-slate-500">
        Položky používané pri tvorbe cenových ponúk (tlačidlo „Generovať z checklistu" v Ponuke). Jednotka: ks / m² / bm.
      </p>
      <EditableList
        columns={[
          { key: 'itemKey', label: 'Kľúč položky', placeholder: 'napr. hydroizolacia_bitutop' },
          { key: 'unit', label: 'Jednotka', placeholder: 'm2 / m / ks' },
          { key: 'unitPrice', label: 'Cena (€)', type: 'number' },
          { key: 'category', label: 'Kategória', type: 'select', options: CATEGORY_OPTIONS },
        ]}
        items={items}
        onCreate={async (draft) => {
          const created = await createPriceListItem({
            itemKey: String(draft.itemKey || ''),
            unit: String(draft.unit || 'ks'),
            unitPrice: Number(draft.unitPrice) || 0,
            category: (draft.category as 'material' | 'prace') || 'material',
          })
          setItems((prev) => [...prev, created])
        }}
        onUpdate={async (id, key, value) => {
          const patch = key === 'unitPrice' ? { unitPrice: Number(value) || 0 } : { [key]: value }
          const updated = await updatePriceListItem(id, patch)
          setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)))
        }}
        onDelete={async (id) => {
          await deletePriceListItem(id)
          setItems((prev) => prev.filter((item) => item.id !== id))
        }}
      />
    </div>
  )
}
