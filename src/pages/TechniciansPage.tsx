import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createTechnician, deleteTechnician, fetchTechnicians, updateTechnician } from '../lib/api'
import EditableList from '../components/EditableList'
import type { Technician } from '../types'

export default function TechniciansPage() {
  const [items, setItems] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTechnicians()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Zoznam zákaziek
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">Technici</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-4">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {loading ? (
          <div className="text-slate-500 text-sm py-8 text-center">Načítavam…</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <EditableList
              columns={[
                { key: 'name', label: 'Meno', placeholder: 'napr. Peter Novák' },
                { key: 'email', label: 'Email', placeholder: 'peter@tmshydra.sk' },
              ]}
              items={items}
              onCreate={async (draft) => {
                const created = await createTechnician({
                  name: String(draft.name || ''),
                  email: String(draft.email || ''),
                })
                setItems((prev) => [...prev, created])
              }}
              onUpdate={async (id, key, value) => {
                const updated = await updateTechnician(id, { [key]: value } as any)
                setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)))
              }}
              onDelete={async (id) => {
                await deleteTechnician(id)
                setItems((prev) => prev.filter((item) => item.id !== id))
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}
