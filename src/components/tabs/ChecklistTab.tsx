import { useRef, useState } from 'react'
import EditableList from '../EditableList'
import AdditionalServicesList from '../AdditionalServicesList'
import TechnicalSolutionChecklist from '../TechnicalSolutionChecklist'
import {
  createAdditionalService,
  createDrainDownspout,
  createGutterSystemItem,
  createRoofAreaSection,
  createRoofEdge,
  deleteAdditionalService,
  deleteDrainDownspout,
  deleteGutterSystemItem,
  deleteRoofAreaSection,
  deleteRoofEdge,
  updateAdditionalService,
  updateDrainDownspout,
  updateGutterSystemItem,
  updateInspection,
  updateRoofAreaSection,
  updateRoofEdge,
} from '../../lib/api'
import type { InspectionDetail } from '../../types'

type BasicSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  inspection: InspectionDetail
  onChange: (patch: Partial<InspectionDetail>) => void
}

const GUTTER_ITEM_SUGGESTIONS = ['haky', 'zlab', 'kotlik', 'cela', 'zvod', 'kolena', 'objimky', 'okap_plech', 'tmel', 'rohy']

export default function ChecklistTab({ inspection, onChange }: Props) {
  const [areaM2, setAreaM2] = useState(inspection.areaM2 ?? '')
  const [isInsulated, setIsInsulated] = useState<boolean | null>(inspection.isInsulated)
  const [description, setDescription] = useState(inspection.currentStateDescription ?? '')
  const [inspectionDate, setInspectionDate] = useState(inspection.inspectionDate ? inspection.inspectionDate.slice(0, 10) : '')
  const [inspectionTime, setInspectionTime] = useState(inspection.inspectionTime ?? '')
  const [basicStatus, setBasicStatus] = useState<BasicSaveStatus>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Saves to the server AND propagates to the parent's `inspection` state via
  // `onChange` on success — without this, other tabs (e.g. Ponuka's "Generovať
  // z checklistu", which reads inspection.areaM2/isInsulated) would keep
  // seeing stale values until a full page reload re-fetches the inspection.
  function scheduleBasicSave(
    apiPatch: Partial<{ areaM2: number | null; isInsulated: boolean | null; currentStateDescription: string | null; inspectionDate: string | null; inspectionTime: string | null }>,
    uiPatch: Partial<InspectionDetail>,
  ) {
    setBasicStatus('saving')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        await updateInspection(inspection.id, apiPatch)
        onChange(uiPatch)
        setBasicStatus('saved')
      } catch {
        setBasicStatus('error')
      }
    }, 800)
  }

  function handleAreaChange(value: string) {
    setAreaM2(value)
    const num = value === '' ? null : Number(value)
    const clean = num === null || Number.isNaN(num) ? null : num
    scheduleBasicSave({ areaM2: clean }, { areaM2: clean === null ? null : String(clean) })
  }

  function handleInsulatedChange(value: string) {
    const val = value === 'yes' ? true : value === 'no' ? false : null
    setIsInsulated(val)
    scheduleBasicSave({ isInsulated: val }, { isInsulated: val })
  }

  function handleDescriptionChange(value: string) {
    setDescription(value)
    scheduleBasicSave({ currentStateDescription: value || null }, { currentStateDescription: value || null })
  }

  function handleInspectionDateChange(value: string) {
    setInspectionDate(value)
    scheduleBasicSave({ inspectionDate: value || null }, { inspectionDate: value || null })
  }

  function handleInspectionTimeChange(value: string) {
    setInspectionTime(value)
    scheduleBasicSave({ inspectionTime: value || null }, { inspectionTime: value || null })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Základné údaje</h2>
          <SaveIndicator status={basicStatus} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dátum obhliadky</label>
            <input
              type="date"
              value={inspectionDate}
              onChange={(e) => handleInspectionDateChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Čas obhliadky</label>
            <input
              type="time"
              value={inspectionTime}
              onChange={(e) => handleInspectionTimeChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Výmera strechy (m²)</label>
            <input
              type="number"
              value={areaM2 ?? ''}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Je strecha zateplená?</label>
            <select
              value={isInsulated === null ? '' : isInsulated ? 'yes' : 'no'}
              onChange={(e) => handleInsulatedChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Neurčené</option>
              <option value="yes">Áno</option>
              <option value="no">Nie</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Popis súčasného stavu</label>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Hrany strechy a atika</h2>
        <EditableList
          columns={[
            { key: 'label', label: 'Označenie', placeholder: 'napr. Hrana A' },
            { key: 'lengthM', label: 'Dĺžka (m)', type: 'number' },
            { key: 'atikaHeightCm', label: 'Výška atiky (cm)', type: 'number' },
          ]}
          items={inspection.roofEdges}
          onCreate={async (draft) => {
            const created = await createRoofEdge({
              inspectionId: inspection.id,
              label: String(draft.label || ''),
              lengthM: Number(draft.lengthM) || 0,
              atikaHeightCm: draft.atikaHeightCm ? Number(draft.atikaHeightCm) : null,
            })
            onChange({ roofEdges: [...inspection.roofEdges, created] })
          }}
          onUpdate={async (id, key, value) => {
            const patch = key === 'lengthM' || key === 'atikaHeightCm' ? { [key]: value === '' ? null : Number(value) } : { [key]: value }
            const updated = await updateRoofEdge(id, patch)
            onChange({ roofEdges: inspection.roofEdges.map((e) => (e.id === id ? { ...e, ...updated } : e)) })
          }}
          onDelete={async (id) => {
            await deleteRoofEdge(id)
            onChange({ roofEdges: inspection.roofEdges.filter((e) => e.id !== id) })
          }}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Čiastkové plochy strechy</h2>
        <EditableList
          columns={[
            { key: 'label', label: 'Označenie', placeholder: 'napr. Časť A' },
            { key: 'widthM', label: 'Šírka (m)', type: 'number' },
            { key: 'heightM', label: 'Výška (m)', type: 'number' },
            { key: 'areaM2', label: 'Plocha (m²)', type: 'readonly' },
          ]}
          items={inspection.roofAreaSections}
          onCreate={async (draft) => {
            const created = await createRoofAreaSection({
              inspectionId: inspection.id,
              label: String(draft.label || ''),
              widthM: Number(draft.widthM) || 0,
              heightM: Number(draft.heightM) || 0,
            })
            onChange({ roofAreaSections: [...inspection.roofAreaSections, created] })
          }}
          onUpdate={async (id, key, value) => {
            const patch = key === 'widthM' || key === 'heightM' ? { [key]: Number(value) || 0 } : { [key]: value }
            const updated = await updateRoofAreaSection(id, patch)
            onChange({ roofAreaSections: inspection.roofAreaSections.map((e) => (e.id === id ? { ...e, ...updated } : e)) })
          }}
          onDelete={async (id) => {
            await deleteRoofAreaSection(id)
            onChange({ roofAreaSections: inspection.roofAreaSections.filter((e) => e.id !== id) })
          }}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Odkvapový systém</h2>
        <datalist id="gutter-item-types">
          {GUTTER_ITEM_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <EditableList
          columns={[
            { key: 'itemType', label: 'Typ položky', placeholder: 'napr. haky' },
            { key: 'quantity', label: 'Množstvo', type: 'number' },
            { key: 'unit', label: 'Jednotka', placeholder: 'ks / m' },
          ]}
          items={inspection.gutterSystemItems}
          onCreate={async (draft) => {
            const created = await createGutterSystemItem({
              inspectionId: inspection.id,
              itemType: String(draft.itemType || ''),
              quantity: Number(draft.quantity) || 0,
              unit: String(draft.unit || 'ks'),
            })
            onChange({ gutterSystemItems: [...inspection.gutterSystemItems, created] })
          }}
          onUpdate={async (id, key, value) => {
            const patch = key === 'quantity' ? { quantity: Number(value) || 0 } : { [key]: value }
            const updated = await updateGutterSystemItem(id, patch)
            onChange({ gutterSystemItems: inspection.gutterSystemItems.map((e) => (e.id === id ? { ...e, ...updated } : e)) })
          }}
          onDelete={async (id) => {
            await deleteGutterSystemItem(id)
            onChange({ gutterSystemItems: inspection.gutterSystemItems.filter((e) => e.id !== id) })
          }}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Zvody</h2>
        <EditableList
          columns={[
            { key: 'label', label: 'Označenie', placeholder: 'napr. Zvod 1' },
            { key: 'lengthM', label: 'Dĺžka (m)', type: 'number' },
          ]}
          items={inspection.drainDownspouts}
          onCreate={async (draft) => {
            const created = await createDrainDownspout({
              inspectionId: inspection.id,
              label: String(draft.label || ''),
              lengthM: Number(draft.lengthM) || 0,
            })
            onChange({ drainDownspouts: [...inspection.drainDownspouts, created] })
          }}
          onUpdate={async (id, key, value) => {
            const patch = key === 'lengthM' ? { lengthM: Number(value) || 0 } : { [key]: value }
            const updated = await updateDrainDownspout(id, patch)
            onChange({ drainDownspouts: inspection.drainDownspouts.map((e) => (e.id === id ? { ...e, ...updated } : e)) })
          }}
          onDelete={async (id) => {
            await deleteDrainDownspout(id)
            onChange({ drainDownspouts: inspection.drainDownspouts.filter((e) => e.id !== id) })
          }}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Technické riešenie</h2>
        <TechnicalSolutionChecklist
          inspectionId={inspection.id}
          items={inspection.technicalSolutionItems}
          onChange={(technicalSolutionItems) => onChange({ technicalSolutionItems })}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Doplnkové práce navyše</h2>
        <AdditionalServicesList
          items={inspection.additionalServices}
          onCreate={async (data) => {
            const created = await createAdditionalService({ inspectionId: inspection.id, ...data })
            onChange({ additionalServices: [...inspection.additionalServices, created] })
          }}
          onUpdate={async (id, data) => {
            const updated = await updateAdditionalService(id, data)
            onChange({ additionalServices: inspection.additionalServices.map((e) => (e.id === id ? { ...e, ...updated } : e)) })
          }}
          onDelete={async (id) => {
            await deleteAdditionalService(id)
            onChange({ additionalServices: inspection.additionalServices.filter((e) => e.id !== id) })
          }}
        />
      </section>
    </div>
  )
}

function SaveIndicator({ status }: { status: BasicSaveStatus }) {
  if (status === 'saving') return <span className="text-xs text-slate-400">Ukladám…</span>
  if (status === 'saved') return <span className="text-xs text-green-600">Uložené</span>
  if (status === 'error') return <span className="text-xs text-red-600">Chyba pri ukladaní</span>
  return null
}
