import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createMaterialComposition,
  deleteMaterialComposition,
  fetchMaterialCompositions,
  fetchMaterialProducts,
  updateMaterialComposition,
} from '../lib/api'
import type { MaterialComposition, MaterialProduct } from '../types'

export default function MaterialCompositionsPage() {
  const [items, setItems] = useState<MaterialComposition[]>([])
  const [products, setProducts] = useState<MaterialProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([fetchMaterialCompositions(), fetchMaterialProducts()])
      .then(([compositions, materialProducts]) => {
        setItems(compositions)
        setProducts(materialProducts)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const created = await createMaterialComposition({ name: newName.trim() })
      setItems((prev) => [...prev, created])
      setNewName('')
      setShowNewForm(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteMaterialComposition(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleUpdated(updated: MaterialComposition) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Zoznam zákaziek
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-1">Materiálové skladby</h1>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
        >
          + Nová skladba
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {showNewForm && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Názov skladby (napr. Alternatíva A)</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
            >
              {creating ? '…' : 'Založiť'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-slate-500 text-sm py-8 text-center">Načítavam…</div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-slate-500 text-sm text-center">
            Zatiaľ žiadne skladby. Založ prvú tlačidlom vyššie.
          </div>
        ) : (
          items.map((item) => (
            <CompositionCard key={item.id} item={item} products={products} onUpdated={handleUpdated} onDelete={handleDelete} />
          ))
        )}
      </main>
    </div>
  )
}

function CompositionCard({
  item,
  products,
  onUpdated,
  onDelete,
}: {
  item: MaterialComposition
  products: MaterialProduct[]
  onUpdated: (updated: MaterialComposition) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(item.name)
  const [layers, setLayers] = useState(item.layersJson.join('\n'))
  const [workSteps, setWorkSteps] = useState(item.workStepsTemplate ?? '')
  const [warrantyYears, setWarrantyYears] = useState(item.warrantyYears?.toString() ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save(
    patch: Partial<{ name: string; layers: string[]; workStepsTemplate: string | null; warrantyYears: number | null; featuredProductId: string | null }>,
  ) {
    setStatus('saving')
    try {
      const updated = await updateMaterialComposition(item.id, patch)
      onUpdated({ ...item, ...updated })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
      <div className="flex items-center justify-between">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== item.name && save({ name })}
          className="text-sm font-semibold text-slate-700 px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded focus:outline-none"
        />
        <div className="flex items-center gap-3">
          {status === 'saving' && <span className="text-xs text-slate-400">Ukladám…</span>}
          {status === 'saved' && <span className="text-xs text-green-600">Uložené</span>}
          <button onClick={() => onDelete(item.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
            Vymazať
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Vrstvy skladby (jedna na riadok)</label>
        <textarea
          value={layers}
          onChange={(e) => setLayers(e.target.value)}
          onBlur={() => save({ layers: layers.split('\n').map((l) => l.trim()).filter(Boolean) })}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Postup prác</label>
        <textarea
          value={workSteps}
          onChange={(e) => setWorkSteps(e.target.value)}
          onBlur={() => save({ workStepsTemplate: workSteps || null })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Záruka (roky)</label>
          <input
            type="number"
            value={warrantyYears}
            onChange={(e) => setWarrantyYears(e.target.value)}
            onBlur={() => save({ warrantyYears: warrantyYears === '' ? null : Number(warrantyYears) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Vyzdvihnutý produkt (technická charakteristika)</label>
          <select
            value={item.featuredProductId ?? ''}
            onChange={(e) => save({ featuredProductId: e.target.value || null })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— žiadny —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
