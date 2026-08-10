import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchWorkSummary } from '../lib/api'
import type { WorkSummary } from '../types'

type Preset = 'month' | 'quarter' | 'year'

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rangeForPreset(preset: Preset, anchor: Date): { from: Date; to: Date } {
  if (preset === 'month') {
    return { from: new Date(anchor.getFullYear(), anchor.getMonth(), 1), to: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0) }
  }
  if (preset === 'quarter') {
    const q = Math.floor(anchor.getMonth() / 3)
    return { from: new Date(anchor.getFullYear(), q * 3, 1), to: new Date(anchor.getFullYear(), q * 3 + 3, 0) }
  }
  return { from: new Date(anchor.getFullYear(), 0, 1), to: new Date(anchor.getFullYear(), 11, 31) }
}

function formatMoney(value: number): string {
  const fixed = value.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${decPart} €`
}

export default function SummaryPage() {
  const [preset, setPreset] = useState<Preset>('month')
  const [anchor] = useState(new Date())
  const [data, setData] = useState<WorkSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { from, to } = useMemo(() => rangeForPreset(preset, anchor), [preset, anchor])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchWorkSummary({ from: toISODate(from), to: toISODate(to) })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, to])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Zoznam zákaziek
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">Súhrn vykonaných prác</h1>
        <div className="w-32" />
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex gap-2">
          {(['month', 'quarter', 'year'] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                preset === p ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p === 'month' ? 'Tento mesiac' : p === 'quarter' ? 'Tento kvartál' : 'Tento rok'}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          {toISODate(from)} – {toISODate(to)} · realizácie podľa dátumu ukončenia (Realizácia do)
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {loading ? (
          <div className="text-slate-500 text-sm py-8 text-center">Načítavam…</div>
        ) : (
          data && (
            <>
              <div className="flex gap-3 text-sm">
                <div className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3">
                  <div className="text-2xl font-semibold text-slate-900">{data.count}</div>
                  <div className="text-slate-500">dokončených realizácií</div>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3">
                  <div className="text-2xl font-semibold text-slate-900">{data.totalAreaM2.toLocaleString('sk-SK')} m²</div>
                  <div className="text-slate-500">spracovaná plocha</div>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3">
                  <div className="text-2xl font-semibold text-slate-900">{formatMoney(data.totalRevenue)}</div>
                  <div className="text-slate-500">obrat (po zľave)</div>
                </div>
              </div>

              {data.items.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-sm">
                  V tomto období nie sú dokončené žiadne realizácie.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {data.items.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {item.customerName} <span className="text-slate-400 font-normal">· {item.label}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.referenceNumber}
                          {item.realizationEndDate ? ` · ${item.realizationEndDate.slice(0, 10)}` : ''}
                          {item.areaM2 !== null ? ` · ${item.areaM2} m²` : ''}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-slate-900 shrink-0">{formatMoney(item.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </main>
    </div>
  )
}
