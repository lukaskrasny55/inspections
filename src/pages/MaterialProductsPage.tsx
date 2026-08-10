import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createMaterialProduct, deleteMaterialProduct, fetchMaterialProducts, updateMaterialProduct } from '../lib/api'
import type { MaterialProduct } from '../types'

export default function MaterialProductsPage() {
  const [items, setItems] = useState<MaterialProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchMaterialProducts()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newDescription.trim()) return
    setCreating(true)
    setError(null)
    try {
      const created = await createMaterialProduct({ name: newName.trim(), description: newDescription.trim() })
      setItems((prev) => [...prev, created])
      setNewName('')
      setNewDescription('')
      setShowNewForm(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteMaterialProduct(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleUpdated(updated: MaterialProduct) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Zoznam zákaziek
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-1">Technické popisy materiálov</h1>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
        >
          + Nový produkt
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {showNewForm && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Názov (napr. BITUTOP APAO)</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Technický popis</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newName.trim() || !newDescription.trim()}
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
            Zatiaľ žiadne produkty. Založ prvý tlačidlom vyššie.
          </div>
        ) : (
          items.map((item) => <ProductCard key={item.id} item={item} onUpdated={handleUpdated} onDelete={handleDelete} />)
        )}
      </main>
    </div>
  )
}

function ProductCard({
  item,
  onUpdated,
  onDelete,
}: {
  item: MaterialProduct
  onUpdated: (updated: MaterialProduct) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save(patch: Partial<{ name: string; description: string }>) {
    setStatus('saving')
    try {
      const updated = await updateMaterialProduct(item.id, patch)
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
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => description !== item.description && save({ description })}
        rows={4}
        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  )
}
