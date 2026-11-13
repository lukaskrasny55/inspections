import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPlan } from '../lib/api'
import { INQUIRY_STAGE_LABELS } from '../types'
import type { InquiryStage, PlanEvent } from '../types'

type Preset = 'week' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom'

const PRESET_LABEL: Record<Preset, string> = {
  week: 'Tento týždeň',
  month: 'Tento mesiac',
  lastMonth: 'Minulý mesiac',
  quarter: 'Tento kvartál',
  year: 'Tento rok',
  custom: 'Vlastné obdobie',
}

const STAGE_ORDER: InquiryStage[] = ['new', 'handled', 'ordered', 'declined', 'completed']

const STAGE_BAR: Record<InquiryStage, string> = {
  new: 'bg-orange-400',
  handled: 'bg-sky-400',
  ordered: 'bg-green-500',
  declined: 'bg-slate-400',
  completed: 'bg-teal-500',
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rangeForPreset(preset: Exclude<Preset, 'custom'>, now: Date): { from: Date; to: Date } {
  const y = now.getFullYear()
  const m = now.getMonth()
  if (preset === 'week') {
    const day = now.getDay()
    const from = new Date(y, m, now.getDate() + (day === 0 ? -6 : 1 - day))
    return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6) }
  }
  if (preset === 'month') return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) }
  if (preset === 'lastMonth') return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) }
  if (preset === 'quarter') {
    const q = Math.floor(m / 3)
    return { from: new Date(y, q * 3, 1), to: new Date(y, q * 3 + 3, 0) }
  }
  return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) }
}

function percent(part: number, whole: number): string {
  if (whole === 0) return '–'
  return `${Math.round((part / whole) * 100)} %`
}

export default function PlanStatsPage() {
  const [preset, setPreset] = useState<Preset>('month')
  const initial = rangeForPreset('month', new Date())
  const [customFrom, setCustomFrom] = useState(toISODate(initial.from))
  const [customTo, setCustomTo] = useState(toISODate(initial.to))
  const [events, setEvents] = useState<PlanEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fromStr, toStr } = useMemo(() => {
    if (preset === 'custom') return { fromStr: customFrom, toStr: customTo }
    const r = rangeForPreset(preset, new Date())
    return { fromStr: toISODate(r.from), toStr: toISODate(r.to) }
  }, [preset, customFrom, customTo])

  const rangeValid = Boolean(fromStr) && Boolean(toStr) && fromStr <= toStr

  useEffect(() => {
    if (!rangeValid) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPlan({ from: fromStr, to: toStr })
      .then((data) => {
        if (!cancelled) setEvents(data)
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
  }, [fromStr, toStr, rangeValid])

  const stats = useMemo(() => {
    const todayKey = toISODate(new Date())
    const inquiries = events.filter((e) => e.type === 'ine' && e.inquiryStage !== null)
    const byStage = new Map<InquiryStage, number>()
    for (const st of STAGE_ORDER) byStage.set(st, 0)
    for (const e of inquiries) {
      const st = e.inquiryStage as InquiryStage
      byStage.set(st, (byStage.get(st) ?? 0) + 1)
    }
    const processed = inquiries.filter((e) => e.inquiryStage !== 'new').length
    const visits = events.filter((e) => e.type === 'obhliadka')
    const visitsFromInquiries = visits.filter((e) => e.webInquiryId).length
    // A realizácia counts as done once its last day (end date, or start if single-day) is today or earlier.
    const done = events.filter((e) => e.type === 'realizacia' && toISODate(new Date(e.endDate ?? e.date)) <= todayKey)
    const planned = events.filter((e) => e.type === 'realizacia').length - done.length
    return {
      inquiries: inquiries.length,
      processed,
      open: inquiries.length - processed,
      visits: visits.length,
      visitsFromInquiries,
      done: done.length,
      planned,
      byStage,
    }
  }, [events])

  const cards = [
    { label: 'dopytov', value: stats.inquiries, hint: 'webové dopyty v období' },
    { label: 'spracovaných', value: stats.processed, hint: `${percent(stats.processed, stats.inquiries)} z dopytov` },
    { label: 'obhliadok', value: stats.visits, hint: `z toho ${stats.visitsFromInquiries} z webového dopytu` },
    { label: 'realizovaných', value: stats.done, hint: stats.planned > 0 ? `+ ${stats.planned} naplánovaných` : 'dokončené do dnes' },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <Link to="/plan" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white">
          ← Plán
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Štatistika plánu</h1>
        <div className="w-16" />
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                preset === p
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {PRESET_LABEL[p]}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Od</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Do</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400">
          {fromStr} – {toStr}
        </div>

        {!rangeValid && <div className="text-red-600 dark:text-red-400 text-sm">Skontroluj obdobie: dátum „od“ musí byť pred dátumom „do“.</div>}
        {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}

        {rangeValid &&
          (loading ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm py-8 text-center">Načítavam…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {cards.map((c) => (
                  <div key={c.label} className="min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{c.value}</div>
                    <div className="text-slate-700 dark:text-slate-300">{c.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{c.hint}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dopyty podľa stavu</h2>
                {stats.inquiries === 0 ? (
                  <div className="text-sm text-slate-400">V tomto období nie sú žiadne dopyty.</div>
                ) : (
                  STAGE_ORDER.map((st) => {
                    const count = stats.byStage.get(st) ?? 0
                    return (
                      <div key={st} className="flex items-center gap-3 text-sm">
                        <div className="w-28 shrink-0 text-slate-600 dark:text-slate-400">{INQUIRY_STAGE_LABELS[st]}</div>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className={`h-full ${STAGE_BAR[st]}`} style={{ width: `${(count / stats.inquiries) * 100}%` }} />
                        </div>
                        <div className="w-16 shrink-0 text-right text-slate-900 dark:text-slate-50">
                          {count} <span className="text-xs text-slate-400">({percent(count, stats.inquiries)})</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="text-xs text-slate-400 leading-relaxed">
                Dopyty = webové dopyty v pláne podľa dátumu dopytu. Spracované = dopyty, ktoré už nie sú v stave „Nový dopyt“. Obhliadky a realizácie sa počítajú podľa naplánovaného
                dátumu; realizácia je „realizovaná“, keď jej posledný deň je dnes alebo skôr.
              </div>
            </>
          ))}
      </main>
    </div>
  )
}
