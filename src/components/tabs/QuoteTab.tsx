import { useEffect, useState } from 'react'
import EditableList from '../EditableList'
import {
  createQuoteAlternative,
  createQuoteLineItem,
  deleteQuoteAlternative,
  deleteQuoteLineItem,
  fetchMaterialCompositions,
  fetchPriceList,
  updateQuoteAlternative,
  updateQuoteLineItem,
} from '../../lib/api'
import type { InspectionDetail, LineItemSection, MaterialComposition, PriceListItem, QuoteAlternative, QuoteLineItem } from '../../types'

const GUTTER_ITEM_LABELS: Record<string, string> = {
  haky: 'Háky',
  zlab: 'Dodanie a montáž žľabového systému KJG (háky, žľaby a príslušenstvo)',
  kotlik: 'Dodanie a montáž zberného kotlíka KJG',
  cela: 'Čelá žľabu',
  zvod: 'Dodanie a montáž zvodového systému KJG',
  kolena: 'Kolená zvodu',
  objimky: 'Objímky zvodu',
  okap_plech: 'Dodanie a montáž odkvapového plechu z pozinkovaného plechu',
  tmel: 'Tesniaci tmel',
  rohy: 'Rohové prvky žľabu',
}

const GUTTER_ITEM_PRICE_KEYS: Record<string, string> = {
  zlab: 'zlabovy_system_kjg',
  kotlik: 'kotlik_zberny_kjg',
  zvod: 'zvodova_rura_kjg_100',
  okap_plech: 'odkvapovy_plech_pozink',
}

// Heuristic default when auto-generating a quote: pick a composition whose name matches the
// checklist's "je strecha zateplená?" answer. Owner can still override via the dropdown below.
function suggestCompositionId(compositions: MaterialComposition[], isInsulated: boolean | null): string | null {
  if (isInsulated === null) return null
  if (isInsulated) {
    const insulated = compositions.filter((c) => /zateplen/i.test(c.name) && !/bez zateplenia/i.test(c.name))
    return insulated.find((c) => !/spádovan/i.test(c.name))?.id ?? insulated[0]?.id ?? null
  }
  return compositions.find((c) => /bez zateplenia/i.test(c.name))?.id ?? null
}

interface Props {
  inspection: InspectionDetail
  onChange: (patch: Partial<InspectionDetail>) => void
}

const LINE_ITEM_COLUMNS = [
  { key: 'description', label: 'Popis', placeholder: 'Popis položky' },
  { key: 'plannedQty', label: 'Množstvo', type: 'number' as const },
  { key: 'unit', label: 'Jednotky', placeholder: 'bm / m2 / ks' },
  { key: 'unitPriceSnapshot', label: 'Jedn. cena (€)', type: 'number' as const },
  { key: 'wastePercent', label: 'Stratné (%)', type: 'number' as const },
  { key: 'total', label: 'Celkom (€)', type: 'number' as const },
]

function sectionTotals(items: QuoteLineItem[], discountPercent: number) {
  const subtotal = items.reduce((sum, li) => sum + Number(li.total), 0)
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100
  const totalAfterDiscount = Math.round((subtotal - discountAmount) * 100) / 100
  return { subtotal, discountAmount, totalAfterDiscount }
}

export default function QuoteTab({ inspection, onChange }: Props) {
  const alternatives = inspection.quoteAlternatives
  const [activeId, setActiveId] = useState<string | null>(alternatives[0]?.id ?? null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [compositions, setCompositions] = useState<MaterialComposition[]>([])
  const [priceList, setPriceList] = useState<PriceListItem[]>([])

  useEffect(() => {
    fetchMaterialCompositions()
      .then(setCompositions)
      .catch(() => setCompositions([]))
    fetchPriceList()
      .then(setPriceList)
      .catch(() => setPriceList([]))
  }, [])

  const active = alternatives.find((a) => a.id === activeId) ?? alternatives[0] ?? null

  function replaceAlternative(updated: QuoteAlternative) {
    onChange({ quoteAlternatives: alternatives.map((a) => (a.id === updated.id ? updated : a)) })
  }

  async function handleCreateAlternative(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) return
    setCreating(true)
    setError(null)
    try {
      const created = await createQuoteAlternative({ inspectionId: inspection.id, label: newLabel.trim() })
      onChange({ quoteAlternatives: [...alternatives, created] })
      setActiveId(created.id)
      setNewLabel('')
      setShowNewForm(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteAlternative(id: string) {
    await deleteQuoteAlternative(id)
    const remaining = alternatives.filter((a) => a.id !== id)
    onChange({ quoteAlternatives: remaining })
    if (activeId === id) setActiveId(remaining[0]?.id ?? null)
  }

  async function handleDiscountBlur(value: string) {
    if (!active) return
    const percent = Number(value)
    if (Number.isNaN(percent) || percent === Number(active.discountPercent)) return
    const updated = await updateQuoteAlternative(active.id, { discountPercent: percent })
    replaceAlternative({ ...active, discountPercent: updated.discountPercent })
  }

  async function handleDescriptionBlur(value: string) {
    if (!active || value === (active.description ?? '')) return
    const updated = await updateQuoteAlternative(active.id, { description: value || null })
    replaceAlternative({ ...active, description: updated.description })
  }

  async function handleDateBlur(field: 'issuedDate' | 'validUntil' | 'realizationStartDate' | 'realizationEndDate', value: string) {
    if (!active) return
    const current = active[field] ? active[field]!.slice(0, 10) : ''
    if (value === current) return
    const updated = await updateQuoteAlternative(active.id, { [field]: value || null })
    replaceAlternative({ ...active, [field]: updated[field] })
  }

  async function handleTimeBlur(field: 'realizationStartTime' | 'realizationEndTime', value: string) {
    if (!active) return
    const current = active[field] ?? ''
    if (value === current) return
    const updated = await updateQuoteAlternative(active.id, { [field]: value || null })
    replaceAlternative({ ...active, [field]: updated[field] })
  }

  async function handleWarrantyBlur(value: string) {
    if (!active) return
    const years = value === '' ? null : Number(value)
    if (value !== '' && Number.isNaN(years)) return
    if (years === active.warrantyYears) return
    const updated = await updateQuoteAlternative(active.id, { warrantyYears: years })
    replaceAlternative({ ...active, warrantyYears: updated.warrantyYears })
  }

  async function handleCompositionChange(value: string) {
    if (!active) return
    const materialCompositionId = value || null
    const updated = await updateQuoteAlternative(active.id, { materialCompositionId })
    const composition = compositions.find((c) => c.id === materialCompositionId) ?? null
    replaceAlternative({ ...active, materialCompositionId: updated.materialCompositionId, materialComposition: composition })
  }

  async function handleGenerateFromChecklist() {
    if (!active) return
    setGenerating(true)
    setError(null)
    try {
      // Clicking this more than once used to just append another batch on top
      // of the last one, silently doubling the quote. Remove the previous
      // auto-generated lines first — anything the owner has since edited by
      // hand is marked source:'manual' by the update endpoint, so it survives.
      const autoGenerated = active.lineItems.filter((li) => li.source === 'auto_calculated')
      for (const li of autoGenerated) {
        await deleteQuoteLineItem(li.id)
      }
      const survivingItems = active.lineItems.filter((li) => li.source !== 'auto_calculated')

      const priceMap = new Map(priceList.map((p) => [p.itemKey, Number(p.unitPrice)]))
      const priceFor = (itemKey: string) => priceMap.get(itemKey) ?? 0

      const drafts: {
        description: string
        plannedQty: number
        unit: string
        section: LineItemSection
        unitPriceSnapshot: number
        wastePercent: number
      }[] = []

      const areaM2 = inspection.areaM2 ? Number(inspection.areaM2) : 0
      if (areaM2 > 0) {
        drafts.push({
          description: 'Dodanie a aplikovanie penetračného náteru LAK expres, čistenie a príprava strechy',
          plannedQty: areaM2,
          unit: 'm2',
          section: 'main',
          unitPriceSnapshot: priceFor('penetracny_nater_lak_expres'),
          wastePercent: 0,
        })
        drafts.push({
          description: 'Dodanie a aplikácia vrchnej hydroizolácie APAO (sanačná plocha, stratné podľa zložitosti strechy uprav)',
          plannedQty: areaM2,
          unit: 'm2',
          section: 'main',
          unitPriceSnapshot: priceFor('vrchna_hydroizolacia_apao'),
          wastePercent: 10,
        })
        drafts.push({
          description: 'Dodanie a aplikovanie odvetrávacích komínkov nového hydroizolačného systému',
          plannedQty: Math.ceil(areaM2 / 50),
          unit: 'ks',
          section: 'main',
          unitPriceSnapshot: priceFor('odvetravacie_kominky'),
          wastePercent: 0,
        })
      }

      const edgeLengthTotal = inspection.roofEdges.reduce((sum, edge) => sum + Number(edge.lengthM), 0)
      if (edgeLengthTotal > 0) {
        drafts.push({
          description: 'Dodanie a aplikovanie atikového klinu',
          plannedQty: edgeLengthTotal,
          unit: 'bm',
          section: 'main',
          unitPriceSnapshot: priceFor('atikovy_klin_puren_ak'),
          wastePercent: 0,
        })
      }

      inspection.gutterSystemItems.forEach((item) => {
        const priceKey = GUTTER_ITEM_PRICE_KEYS[item.itemType]
        drafts.push({
          description: GUTTER_ITEM_LABELS[item.itemType] ?? item.itemType,
          plannedQty: Number(item.quantity),
          unit: item.unit,
          section: 'nad_ramec',
          unitPriceSnapshot: priceKey ? priceFor(priceKey) : 0,
          wastePercent: 0,
        })
      })
      inspection.drainDownspouts.forEach((d) => {
        drafts.push({
          description: `Dodanie a montáž zvodového systému KJG – ${d.label}`,
          plannedQty: Number(d.lengthM),
          unit: 'bm',
          section: 'nad_ramec',
          unitPriceSnapshot: priceFor('zvodova_rura_kjg_100'),
          wastePercent: 0,
        })
      })
      inspection.additionalServices.forEach((service) => {
        drafts.push({
          description: service.description,
          plannedQty: 1,
          unit: 'ks',
          section: 'nad_ramec',
          unitPriceSnapshot: 0,
          wastePercent: 0,
        })
      })

      let items = [...survivingItems]
      for (const draft of drafts) {
        const created = await createQuoteLineItem({
          quoteAlternativeId: active.id,
          description: draft.description,
          plannedQty: draft.plannedQty,
          unitPriceSnapshot: draft.unitPriceSnapshot,
          wastePercent: draft.wastePercent,
          unit: draft.unit,
          section: draft.section,
          source: 'auto_calculated',
        })
        items = [...items, created]
      }

      let nextAlternative: QuoteAlternative = { ...active, lineItems: items }
      if (!active.materialCompositionId && inspection.isInsulated !== null) {
        const suggestedId = suggestCompositionId(compositions, inspection.isInsulated)
        if (suggestedId) {
          const updated = await updateQuoteAlternative(active.id, { materialCompositionId: suggestedId })
          const composition = compositions.find((c) => c.id === suggestedId) ?? null
          nextAlternative = { ...nextAlternative, materialCompositionId: updated.materialCompositionId, materialComposition: composition }
        }
      }
      replaceAlternative(nextAlternative)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSendQuoteEmail() {
    if (!active) return
    setSendingEmail(true)
    setEmailStatus(null)
    try {
      const res = await fetch('/api/send-quote-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: active.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Odoslanie zlyhalo.')
      setEmailStatus('Ponuka bola odoslaná zákazníkovi emailom.')
    } catch (err) {
      setEmailStatus((err as Error).message)
    } finally {
      setSendingEmail(false)
    }
  }

  function makeSectionHandlers(section: LineItemSection) {
    if (!active) return null
    return {
      onCreate: async (draft: Record<string, string | boolean>) => {
        const created = await createQuoteLineItem({
          quoteAlternativeId: active.id,
          description: String(draft.description || ''),
          plannedQty: Number(draft.plannedQty) || 0,
          unitPriceSnapshot: Number(draft.unitPriceSnapshot) || 0,
          wastePercent: Number(draft.wastePercent) || 0,
          unit: String(draft.unit || 'ks'),
          section,
        })
        replaceAlternative({ ...active, lineItems: [...active.lineItems, created] })
      },
      onUpdate: async (id: string, key: string, value: string | boolean) => {
        const numericKeys = ['plannedQty', 'unitPriceSnapshot', 'wastePercent', 'total']
        const patch = numericKeys.includes(key) ? { [key]: Number(value) } : { [key]: value }
        const updated = await updateQuoteLineItem(id, patch)
        replaceAlternative({ ...active, lineItems: active.lineItems.map((li) => (li.id === id ? { ...li, ...updated } : li)) })
      },
      onDelete: async (id: string) => {
        await deleteQuoteLineItem(id)
        replaceAlternative({ ...active, lineItems: active.lineItems.filter((li) => li.id !== id) })
      },
    }
  }

  const discountPercent = active ? Number(active.discountPercent) : 0
  const mainItems = active ? active.lineItems.filter((li) => li.section === 'main') : []
  const nadRamecItems = active ? active.lineItems.filter((li) => li.section === 'nad_ramec') : []
  const mainTotals = sectionTotals(mainItems, discountPercent)
  const nadRamecTotals = sectionTotals(nadRamecItems, discountPercent)
  const grandSubtotal = mainTotals.subtotal + nadRamecTotals.subtotal
  const grandDiscountAmount = Math.round(grandSubtotal * (discountPercent / 100) * 100) / 100
  const grandTotal = Math.round((grandSubtotal - grandDiscountAmount) * 100) / 100

  const mainHandlers = makeSectionHandlers('main')
  const nadRamecHandlers = makeSectionHandlers('nad_ramec')

  // Fields that would render as a blank line in the generated DOCX if left
  // empty — surfaced before download/send so a gap gets noticed here, not
  // after the customer already has the document in hand.
  const missingFields: string[] = []
  if (active) {
    if (mainItems.length === 0 && nadRamecItems.length === 0) missingFields.push('žiadne položky ponuky')
    if (!active.issuedDate) missingFields.push('dátum vystavenia')
    if (!active.validUntil) missingFields.push('platnosť do')
    if (active.warrantyYears === null) missingFields.push('záruka (roky)')
    if (!active.materialCompositionId) missingFields.push('materiálová skladba (pre Návrh riešenia)')
    if (!inspection.customer.email) missingFields.push('email zákazníka (pre odoslanie)')
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2 flex-wrap">
        {alternatives.map((alt) => (
          <button
            key={alt.id}
            onClick={() => setActiveId(alt.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              active?.id === alt.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {alt.label}
          </button>
        ))}
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="px-4 py-2 rounded-full text-sm font-medium bg-brand-50 text-brand-700 hover:bg-brand-100"
        >
          + Alternatíva
        </button>
      </div>

      {showNewForm && (
        <form onSubmit={handleCreateAlternative} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3 items-end max-w-sm">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Označenie (napr. A)</label>
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newLabel.trim()}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
          >
            {creating ? '…' : 'Založiť'}
          </button>
        </form>
      )}

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {!active || !mainHandlers || !nadRamecHandlers ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-slate-500 text-sm text-center">
          Zatiaľ žiadna cenová alternatíva. Založ prvú tlačidlom „+ Alternatíva".
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Cenová ponuka – alternatíva {active.label}</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                Zľava (%)
                <input
                  type="number"
                  defaultValue={active.discountPercent}
                  onBlur={(e) => handleDiscountBlur(e.target.value)}
                  className="w-16 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
              <button
                onClick={handleGenerateFromChecklist}
                disabled={generating}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                {generating ? 'Generujem…' : '↻ Generovať z checklistu'}
              </button>
              <a
                href={`/api/generate-quote-document?id=${active.id}`}
                className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-md"
              >
                ⬇ Cenová ponuka (DOCX)
              </a>
              <a
                href={`/api/generate-technical-document?id=${active.id}`}
                className="text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md"
              >
                ⬇ Návrh riešenia (DOCX)
              </a>
              <button
                onClick={handleSendQuoteEmail}
                disabled={sendingEmail || !inspection.customer.email}
                title={!inspection.customer.email ? 'Zákazník nemá vyplnený email (Kontakt tab)' : undefined}
                className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {sendingEmail ? 'Odosielam…' : '✉ Odoslať zákazníkovi'}
              </button>
              <button onClick={() => handleDeleteAlternative(active.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                Vymazať alternatívu
              </button>
            </div>
          </div>
          {emailStatus && <div className="text-xs text-slate-500 -mt-2">{emailStatus}</div>}
          {missingFields.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 -mt-2">
              ⚠ V dokumente budú prázdne polia — chýba: {missingFields.join(', ')}.
            </div>
          )}

          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Popis alternatívy</label>
                <input
                  key={active.id}
                  defaultValue={active.description ?? ''}
                  placeholder="napr. zo zateplením"
                  onBlur={(e) => handleDescriptionBlur(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Dátum vystavenia</label>
                <input
                  key={`${active.id}-issued`}
                  type="date"
                  defaultValue={active.issuedDate ? active.issuedDate.slice(0, 10) : ''}
                  onBlur={(e) => handleDateBlur('issuedDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Platí do</label>
                <input
                  key={`${active.id}-valid`}
                  type="date"
                  defaultValue={active.validUntil ? active.validUntil.slice(0, 10) : ''}
                  onBlur={(e) => handleDateBlur('validUntil', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Záruka (roky)</label>
                <input
                  key={`${active.id}-warranty`}
                  type="number"
                  defaultValue={active.warrantyYears ?? ''}
                  onBlur={(e) => handleWarrantyBlur(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Realizácia od</label>
                <input
                  key={`${active.id}-realization-start`}
                  type="date"
                  defaultValue={active.realizationStartDate ? active.realizationStartDate.slice(0, 10) : ''}
                  onBlur={(e) => handleDateBlur('realizationStartDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Realizácia do</label>
                <input
                  key={`${active.id}-realization-end`}
                  type="date"
                  defaultValue={active.realizationEndDate ? active.realizationEndDate.slice(0, 10) : ''}
                  onBlur={(e) => handleDateBlur('realizationEndDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Čas realizácie od</label>
                <input
                  key={`${active.id}-realization-start-time`}
                  type="time"
                  defaultValue={active.realizationStartTime ?? ''}
                  onBlur={(e) => handleTimeBlur('realizationStartTime', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Čas realizácie do</label>
                <input
                  key={`${active.id}-realization-end-time`}
                  type="time"
                  defaultValue={active.realizationEndTime ?? ''}
                  onBlur={(e) => handleTimeBlur('realizationEndTime', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Materiálová skladba (pre Návrh technického riešenia)</label>
                <select
                  key={`${active.id}-composition`}
                  value={active.materialCompositionId ?? ''}
                  onChange={(e) => handleCompositionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— žiadna —</option>
                  {compositions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Hydroizolačné a zatepľovacie práce</h3>
            <EditableList columns={LINE_ITEM_COLUMNS} items={mainItems} {...mainHandlers} />
            <SectionSummary {...mainTotals} discountPercent={discountPercent} />
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Tesárske a klampiarske práce (nad rámec)</h3>
            <EditableList columns={LINE_ITEM_COLUMNS} items={nadRamecItems} {...nadRamecHandlers} />
            <SectionSummary {...nadRamecTotals} discountPercent={discountPercent} />
          </section>

          <div className="bg-slate-900 text-white rounded-lg p-6 flex justify-end">
            <div className="text-right space-y-1">
              <div className="text-xs text-slate-300">Spolu {grandSubtotal.toFixed(2)} € · Zľava {discountPercent}% (−{grandDiscountAmount.toFixed(2)} €)</div>
              <div className="text-2xl font-semibold">Celkom na úhradu: {grandTotal.toFixed(2)} €</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionSummary({
  subtotal,
  discountAmount,
  totalAfterDiscount,
  discountPercent,
}: {
  subtotal: number
  discountAmount: number
  totalAfterDiscount: number
  discountPercent: number
}) {
  return (
    <div className="flex justify-end pt-2 border-t border-slate-100">
      <div className="text-right text-sm space-y-0.5">
        <div className="text-slate-500">Spolu: {subtotal.toFixed(2)} €</div>
        <div className="text-slate-500">
          Zľava {discountPercent}%: −{discountAmount.toFixed(2)} €
        </div>
        <div className="font-semibold text-slate-900">Celkom na úhradu: {totalAfterDiscount.toFixed(2)} €</div>
      </div>
    </div>
  )
}
