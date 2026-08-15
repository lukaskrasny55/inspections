import { useState } from 'react'

interface Props {
  onSuccess: () => void
}

export default function LoginPage({ onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/session-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Nesprávne heslo.')
      }
      onSuccess()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6">
      <form onSubmit={handleSubmit} className="max-w-sm w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
        <div className="text-center space-y-2">
          <svg viewBox="0 0 100 100" className="w-10 h-10 mx-auto" aria-hidden="true">
            <path d="M50 6 L90 28 L90 72 L50 94 L10 72 L10 28 Z" fill="none" className="stroke-slate-900 dark:stroke-slate-100" strokeWidth="7" />
          </svg>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">TMS Hydra – Obhliadky</h1>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Heslo</label>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full px-4 py-2.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Prihlasujem…' : 'Prihlásiť sa'}
        </button>
      </form>
    </div>
  )
}
