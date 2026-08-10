import { useEffect, useState, type ReactNode } from 'react'
import LoginPage from '../pages/LoginPage'

type Status = 'checking' | 'authorized' | 'unauthorized'

export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    let cancelled = false
    fetch('/api/session-check')
      .then((res) => res.json())
      .then((data: { authEnabled: boolean; authorized: boolean }) => {
        if (cancelled) return
        setStatus(!data.authEnabled || data.authorized ? 'authorized' : 'unauthorized')
      })
      .catch(() => {
        // If the check itself fails (e.g. offline on first load), don't lock
        // the user out of an app whose whole point is offline use.
        if (!cancelled) setStatus('authorized')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Načítavam…</div>
  }

  if (status === 'unauthorized') {
    return <LoginPage onSuccess={() => setStatus('authorized')} />
  }

  return <>{children}</>
}
