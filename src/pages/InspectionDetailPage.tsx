import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { duplicateInspection, fetchInspection, fetchTechnicians, updateInspection } from '../lib/api'
import { cacheSet } from '../lib/db'
import SyncStatus from '../components/SyncStatus'
import { STATUS_LABELS, type InspectionDetail, type InspectionStatus, type Technician } from '../types'
import ContactTab from '../components/tabs/ContactTab'
import ChecklistTab from '../components/tabs/ChecklistTab'
import QuoteTab from '../components/tabs/QuoteTab'
import PhotosTab from '../components/tabs/PhotosTab'
import SketchTab from '../components/tabs/SketchTab'

const TABS = [
  { key: 'photos', label: 'Fotky' },
  { key: 'sketch', label: 'Výkres' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'contact', label: 'Kontakt' },
  { key: 'quote', label: 'Ponuka' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [inspection, setInspection] = useState<InspectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('contact')
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [duplicating, setDuplicating] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    fetchInspection(id)
      .then((data) => {
        if (!cancelled) setInspection(data)
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
  }, [id])

  useEffect(() => {
    fetchTechnicians()
      .then(setTechnicians)
      .catch(() => setTechnicians([]))
  }, [])

  function handleInspectionChange(patch: Partial<InspectionDetail>) {
    setInspection((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      // Keep the offline cache current so a reload while still offline shows
      // everything entered so far, not just what was last fetched from the
      // network — every mutation in every tab flows through this one place.
      cacheSet(`/api/inspections/${next.id}`, next)
      return next
    })
  }

  async function handleDuplicate() {
    if (!inspection || duplicating) return
    if (!navigator.onLine) {
      setError('Duplikovanie potrebuje pripojenie na internet.')
      return
    }
    setDuplicating(true)
    try {
      const created = await duplicateInspection(inspection.id)
      navigate(`/inspections/${created.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDuplicating(false)
    }
  }

  async function handleStatusChange(status: InspectionStatus) {
    if (!inspection) return
    const previous = inspection.status
    handleInspectionChange({ status })
    try {
      await updateInspection(inspection.id, { status })
    } catch {
      handleInspectionChange({ status: previous })
    }
  }

  async function handleTechnicianChange(technicianId: string) {
    if (!inspection) return
    const previous = inspection.technicianId
    const nextId = technicianId || null
    const technician = technicians.find((t) => t.id === nextId) ?? null
    handleInspectionChange({ technicianId: nextId, technician })
    try {
      await updateInspection(inspection.id, { technicianId: nextId })
    } catch {
      handleInspectionChange({ technicianId: previous, technician: technicians.find((t) => t.id === previous) ?? null })
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Načítavam…</div>
  }

  if (error || !inspection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500">
        <div>{error || 'Obhliadka nebola nájdená.'}</div>
        <Link to="/" className="text-brand-600 text-sm">
          Späť na zoznam
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Zoznam zákaziek
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-1">{inspection.customer.name}</h1>
          <div className="text-sm text-slate-500">{inspection.referenceNumber}</div>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus />
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Vytvorí novú obhliadku s rovnakými kontaktnými a checklist údajmi — užitočné pri viacerých rovnakých vchodoch/jednotkách"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            {duplicating ? 'Duplikujem…' : '⧉ Duplikovať'}
          </button>
          <select
            value={inspection.technicianId ?? ''}
            onChange={(e) => handleTechnicianChange(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border-none focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <option value="">Bez technika</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
          <select
            value={inspection.status}
            onChange={(e) => handleStatusChange(e.target.value as InspectionStatus)}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border-none focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            {(Object.keys(STATUS_LABELS) as InspectionStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && (
        <div className="max-w-5xl mx-auto px-6 pt-3">
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-md">{error}</div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex">
        <nav className="w-48 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-73px)]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full text-left px-5 py-3.5 text-sm font-medium transition border-l-4 ${
                activeTab === tab.key
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6">
          {activeTab === 'photos' ? (
            <PhotosTab key={inspection.id} inspection={inspection} onChange={handleInspectionChange} />
          ) : activeTab === 'sketch' ? (
            <SketchTab key={inspection.id} inspection={inspection} onChange={handleInspectionChange} />
          ) : activeTab === 'contact' ? (
            <ContactTab
              key={inspection.id}
              customer={inspection.customer}
              onSaved={(customer) => handleInspectionChange({ customer })}
            />
          ) : activeTab === 'checklist' ? (
            <ChecklistTab key={inspection.id} inspection={inspection} onChange={handleInspectionChange} />
          ) : (
            <QuoteTab key={inspection.id} inspection={inspection} onChange={handleInspectionChange} />
          )}
        </main>
      </div>
    </div>
  )
}
