import { useState } from 'react'

export interface Column {
  key: string
  label: string
  type?: 'text' | 'number' | 'checkbox' | 'select' | 'readonly'
  placeholder?: string
  options?: { value: string; label: string }[]
}

interface Props {
  columns: Column[]
  items: Record<string, any>[]
  onCreate: (draft: Record<string, string | boolean>) => Promise<void>
  onUpdate: (id: string, key: string, value: string | boolean) => Promise<void>
  // Omit to hide the delete column entirely — e.g. for catalogs where records
  // must be deactivated (isActive) instead of removed, since other rows may
  // already reference them.
  onDelete?: (id: string) => Promise<void>
}

export default function EditableList({ columns, items, onCreate, onUpdate, onDelete }: Props) {
  const emptyDraft = (): Record<string, string | boolean> =>
    columns.reduce((acc, col) => {
      acc[col.key] = col.type === 'checkbox' ? false : col.type === 'select' ? col.options?.[0]?.value ?? '' : ''
      return acc
    }, {} as Record<string, string | boolean>)

  const [draft, setDraft] = useState<Record<string, string | boolean>>(emptyDraft())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleAdd() {
    setCreating(true)
    setError(null)
    try {
      await onCreate(draft)
      setDraft(emptyDraft())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleCellUpdate(id: string, key: string, value: string | boolean) {
    setBusyId(id)
    setError(null)
    try {
      await onUpdate(id, key, value)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!onDelete) return
    setBusyId(id)
    setError(null)
    try {
      await onDelete(id)
    } catch (err) {
      setError((err as Error).message)
      setBusyId(null)
    }
  }

  function renderCell(col: Column, value: unknown, onCommit: (value: string | boolean) => void, disabled: boolean) {
    if (col.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(e) => onCommit(e.target.checked)}
          className="w-4 h-4"
        />
      )
    }
    if (col.type === 'select') {
      return (
        <select
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onCommit(e.target.value)}
          className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded text-sm focus:outline-none bg-transparent"
        >
          {col.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }
    return null
  }

  return (
    <div className="space-y-2">
      {error && <div className="text-red-600 text-xs">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              {columns.map((col) => (
                <th key={col.key} className="py-1.5 pr-3 font-medium">
                  {col.label}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              // Keying on the full item value (not just id) forces a remount when any field
              // changes — including server-derived fields like a recomputed total that update
              // as a side effect of editing a different cell. Plain defaultValue-based inputs
              // otherwise never pick up that change since the row itself never re-mounts.
              <tr key={`${item.id}:${JSON.stringify(item)}`} className="border-b border-slate-100">
                {columns.map((col) => (
                  <td key={col.key} className="py-1.5 pr-3">
                    {col.type === 'readonly' ? (
                      <span className="px-2 py-1 text-slate-500">{item[col.key] ?? ''}</span>
                    ) : col.type === 'checkbox' || col.type === 'select' ? (
                      renderCell(col, item[col.key], (value) => handleCellUpdate(item.id, col.key, value), busyId === item.id)
                    ) : (
                      <input
                        type={col.type === 'number' ? 'number' : 'text'}
                        defaultValue={item[col.key] ?? ''}
                        disabled={busyId === item.id}
                        onBlur={(e) => {
                          if (e.target.value !== String(item[col.key] ?? '')) {
                            handleCellUpdate(item.id, col.key, e.target.value)
                          }
                        }}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded text-sm focus:outline-none"
                      />
                    )}
                  </td>
                ))}
                <td>
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={busyId === item.id}
                      className="text-slate-400 hover:text-red-600 px-1"
                      title="Vymazať"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
            <tr>
              {columns.map((col) => (
                <td key={col.key} className="py-1.5 pr-3">
                  {col.type === 'readonly' ? (
                    <span className="px-2 py-1 text-slate-300">auto</span>
                  ) : col.type === 'checkbox' || col.type === 'select' ? (
                    renderCell(col, draft[col.key], (value) => setDraft((d) => ({ ...d, [col.key]: value })), false)
                  ) : (
                    <input
                      type={col.type === 'number' ? 'number' : 'text'}
                      value={draft[col.key] as string}
                      placeholder={col.placeholder}
                      onChange={(e) => setDraft((d) => ({ ...d, [col.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd()
                      }}
                      className="w-full px-2 py-1 border border-dashed border-slate-300 rounded text-sm focus:outline-none focus:border-brand-400"
                    />
                  )}
                </td>
              ))}
              <td>
                <button
                  onClick={handleAdd}
                  disabled={creating}
                  className="text-brand-600 hover:text-brand-700 text-xs font-medium px-1"
                >
                  {creating ? '…' : '+'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
