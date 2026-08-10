import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createDocumentTemplate, deleteDocumentTemplate, fetchDocumentTemplates, updateDocumentTemplate } from '../lib/api'
import type { DocumentTemplate } from '../types'

export default function DocumentTemplatesPage() {
  const [items, setItems] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchDocumentTemplates()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newKey.trim() || !newTitle.trim()) return
    setCreating(true)
    setError(null)
    try {
      const created = await createDocumentTemplate({ key: newKey.trim(), title: newTitle.trim() })
      setItems((prev) => [...prev, created])
      setNewKey('')
      setNewTitle('')
      setShowNewForm(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteDocumentTemplate(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleUpdated(updated: DocumentTemplate) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Zoznam zákaziek
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-1">Textové šablóny dokumentov</h1>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
        >
          + Nová šablóna
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {showNewForm && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kľúč (napr. company_story, email_intro)</label>
              <input
                autoFocus
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Názov</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newKey.trim() || !newTitle.trim()}
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
            Zatiaľ žiadne šablóny. Založ prvú tlačidlom vyššie.
          </div>
        ) : (
          items.map((item) => <TemplateCard key={item.id} item={item} onUpdated={handleUpdated} onDelete={handleDelete} />)
        )}
      </main>
    </div>
  )
}

function TemplateCard({
  item,
  onUpdated,
  onDelete,
}: {
  item: DocumentTemplate
  onUpdated: (updated: DocumentTemplate) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [content, setContent] = useState(item.content)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save(patch: Partial<{ title: string; content: string }>) {
    setStatus('saving')
    try {
      const updated = await updateDocumentTemplate(item.id, patch)
      onUpdated({ ...item, ...updated })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== item.title && save({ title })}
            className="text-sm font-semibold text-slate-700 px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded focus:outline-none"
          />
          <div className="text-xs text-slate-400 px-2">{item.key}</div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'saving' && <span className="text-xs text-slate-400">Ukladám…</span>}
          {status === 'saved' && <span className="text-xs text-green-600">Uložené</span>}
          <button onClick={() => onDelete(item.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
            Vymazať
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => content !== item.content && save({ content })}
        rows={6}
        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  )
}
