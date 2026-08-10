import { useEffect, useState } from 'react'
import { pendingSyncCount, syncEvents } from '../lib/offlineFetch'

export default function SyncStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    function refreshPending() {
      pendingSyncCount().then(setPending)
    }
    refreshPending()
    const handleOnline = () => {
      setOnline(true)
      refreshPending()
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    syncEvents.addEventListener('change', refreshPending)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      syncEvents.removeEventListener('change', refreshPending)
    }
  }, [])

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
          online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500'}`} />
        {online ? 'Online' : 'Offline'}
      </span>
      {pending > 0 && (
        <span className="px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 font-medium">
          {pending} čaká na synchronizáciu
        </span>
      )}
    </div>
  )
}
