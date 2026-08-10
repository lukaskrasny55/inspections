import type {
  AdditionalService,
  CalendarEvent,
  ChecklistItemCatalog,
  ChecklistItemCategory,
  ChecklistItemSource,
  CompanySettings,
  Customer,
  DocumentTemplate,
  DrainDownspout,
  GutterSystemItem,
  InspectionDetail,
  InspectionListItem,
  InspectionPhoto,
  InspectionSketch,
  InspectionStatus,
  MaterialComposition,
  MaterialProduct,
  PlanEvent,
  PriceListItem,
  WorkSummary,
  QuoteAlternative,
  QuoteLineItem,
  RoofAreaSection,
  RoofEdge,
  TechnicalSolutionItem,
  Technician,
} from '../types'
import { cacheGetWithFallback, cacheSet } from './db'
import { newId } from './id'
import { offlineDelete, offlineGet, offlineMutate } from './offlineFetch'

async function postJSON<T>(url: string, body: Record<string, unknown>, buildOptimistic?: () => T | Promise<T>): Promise<T> {
  return offlineMutate<T>('POST', url, body, buildOptimistic ?? (() => ({ ...body }) as T))
}

async function patchJSON<T>(url: string, body: Record<string, unknown>, buildOptimistic?: () => T | Promise<T>): Promise<T> {
  return offlineMutate<T>('PATCH', url, body, buildOptimistic ?? (() => ({ ...body }) as T))
}

async function deleteRequest(url: string): Promise<void> {
  const clientRecordId = url.split('?')[0].split('/').pop()
  return offlineDelete(url, clientRecordId)
}

export async function fetchInspections(params: { status?: InspectionStatus; q?: string } = {}) {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.q) search.set('q', params.q)
  return offlineGet<InspectionListItem[]>(`/api/inspections?${search.toString()}`, 'Nepodarilo sa načítať zákazky.')
}

export async function fetchPlan(params: { from: string; to: string }) {
  const search = new URLSearchParams({ from: params.from, to: params.to })
  return offlineGet<PlanEvent[]>(`/api/plan?${search.toString()}`, 'Nepodarilo sa načítať plán.')
}

export async function fetchWorkSummary(params: { from: string; to: string }) {
  const search = new URLSearchParams({ from: params.from, to: params.to })
  return offlineGet<WorkSummary>(`/api/work-summary?${search.toString()}`, 'Nepodarilo sa načítať súhrn.')
}

export async function fetchInspection(id: string) {
  return offlineGet<InspectionDetail>(`/api/inspections/${id}`, 'Nepodarilo sa načítať obhliadku.')
}

/** Best-effort offline reference number: counts cached inspections from this
 * year the same way the server does. Falls back to a timestamp-based number
 * (same style already used elsewhere in this app) if nothing is cached yet.
 * Real, gapless numbering only applies to inspections created while online —
 * the server-side counter was always best-effort under concurrency too. */
async function buildOfflineReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  try {
    const cached = (await cacheGetWithFallback('/api/inspections?')) as InspectionListItem[] | undefined
    if (cached) {
      const countThisYear = cached.filter((i) => new Date(i.createdAt).getFullYear() === year).length
      return `OBH-${String(countThisYear + 1).padStart(3, '0')}/${year}`
    }
  } catch {
    // fall through to timestamp fallback
  }
  return `OBH-${Date.now()}`
}

export async function createInspection(data: {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
}) {
  const id = newId()
  const customerId = newId()
  return postJSON<InspectionListItem>('/api/inspections', { id, customerId, ...data }, async () => {
    const now = new Date().toISOString()
    const customer = {
      id: customerId,
      name: data.customerName,
      address: data.customerAddress ?? null,
      siteAddress: null,
      phone: data.customerPhone ?? null,
      email: data.customerEmail ?? null,
      buildingAdmin: null,
      createdAt: now,
      updatedAt: now,
    }
    const listItem: InspectionListItem = {
      id,
      referenceNumber: await buildOfflineReferenceNumber(),
      status: 'draft',
      inspectionDate: null,
      inspectionTime: null,
      areaM2: null,
      createdAt: now,
      updatedAt: now,
      customer,
    }
    // Also seed the detail-page cache: creating an inspection while offline
    // and immediately opening it (the normal flow) must work without a
    // round trip — there's nothing on the server yet to fetch.
    const detail: InspectionDetail = {
      ...listItem,
      currentStateDescription: null,
      isInsulated: null,
      technicianId: null,
      technician: null,
      photos: [],
      sketch: null,
      roofEdges: [],
      roofAreaSections: [],
      technicalSolutionItems: [],
      drainDownspouts: [],
      gutterSystemItems: [],
      additionalServices: [],
      quoteAlternatives: [],
    }
    await cacheSet(`/api/inspections/${id}`, detail)
    return listItem
  })
}

// Duplicating reads a lot of server-side source data (roof edges, sections,
// etc.) to copy, so unlike other creates this isn't queued for offline replay
// — it requires a live connection, same as fetching data does.
export async function duplicateInspection(sourceId: string): Promise<InspectionListItem> {
  const res = await fetch('/api/inspections/duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: newId(), customerId: newId(), sourceId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodarilo sa duplikovať obhliadku.')
  return data
}

export async function updateCustomer(id: string, data: Partial<Pick<Customer, 'name' | 'address' | 'siteAddress' | 'phone' | 'email' | 'buildingAdmin'>>) {
  return patchJSON<Customer>(`/api/customers/${id}`, data)
}

export async function updateInspection(
  id: string,
  data: Partial<{
    areaM2: number | null
    isInsulated: boolean | null
    currentStateDescription: string | null
    inspectionDate: string | null
    inspectionTime: string | null
    status: InspectionStatus
    technicianId: string | null
  }>,
) {
  return patchJSON<InspectionListItem>(`/api/inspections/${id}`, data)
}

export async function createRoofEdge(data: { inspectionId: string; label?: string; lengthM: number; atikaHeightCm?: number | null }) {
  return postJSON<RoofEdge>('/api/roof-edges', { id: newId(), ...data })
}
export async function updateRoofEdge(id: string, data: Partial<{ label: string; lengthM: number; atikaHeightCm: number | null }>) {
  return patchJSON<RoofEdge>(`/api/roof-edges/${id}`, data)
}
export async function deleteRoofEdge(id: string) {
  return deleteRequest(`/api/roof-edges/${id}`)
}

export async function createGutterSystemItem(data: { inspectionId: string; itemType: string; quantity: number; unit?: string }) {
  return postJSON<GutterSystemItem>('/api/gutter-system-items', { id: newId(), ...data })
}
export async function updateGutterSystemItem(id: string, data: Partial<{ itemType: string; quantity: number; unit: string }>) {
  return patchJSON<GutterSystemItem>(`/api/gutter-system-items/${id}`, data)
}
export async function deleteGutterSystemItem(id: string) {
  return deleteRequest(`/api/gutter-system-items/${id}`)
}

export async function createDrainDownspout(data: { inspectionId: string; label?: string; lengthM: number }) {
  return postJSON<DrainDownspout>('/api/drain-downspouts', { id: newId(), ...data })
}
export async function updateDrainDownspout(id: string, data: Partial<{ label: string; lengthM: number }>) {
  return patchJSON<DrainDownspout>(`/api/drain-downspouts/${id}`, data)
}
export async function deleteDrainDownspout(id: string) {
  return deleteRequest(`/api/drain-downspouts/${id}`)
}

export async function createTechnicalSolutionItem(data: { inspectionId: string; catalogItemId: string; isChecked?: boolean; valueNumber?: number; notes?: string }) {
  return postJSON<TechnicalSolutionItem>('/api/technical-solution-items', { id: newId(), ...data })
}
export async function updateTechnicalSolutionItem(id: string, data: Partial<{ isChecked: boolean; valueNumber: number | null; notes: string | null }>) {
  return patchJSON<TechnicalSolutionItem>(`/api/technical-solution-items/${id}`, data)
}
export async function deleteTechnicalSolutionItem(id: string) {
  return deleteRequest(`/api/technical-solution-items/${id}`)
}

export async function fetchChecklistItemCatalog(activeOnly = false) {
  return offlineGet<ChecklistItemCatalog[]>(`/api/checklist-item-catalog${activeOnly ? '?active=true' : ''}`, 'Nepodarilo sa načítať položky checklistu.')
}
export async function createChecklistItemCatalog(data: { name: string; unit?: string; defaultUnitPrice: number; category: ChecklistItemCategory; source?: ChecklistItemSource }) {
  return postJSON<ChecklistItemCatalog>('/api/checklist-item-catalog', { id: newId(), ...data })
}
export async function updateChecklistItemCatalog(id: string, data: Partial<{ name: string; unit: string; defaultUnitPrice: number; category: ChecklistItemCategory; isActive: boolean }>) {
  return patchJSON<ChecklistItemCatalog>(`/api/checklist-item-catalog/${id}`, data)
}

export async function createQuoteAlternative(data: { inspectionId: string; label: string }) {
  return postJSON<QuoteAlternative>('/api/quote-alternatives', { id: newId(), ...data }, () => ({
    id: newId(),
    label: data.label,
    description: null,
    discountPercent: '0',
    totalPrice: null,
    issuedDate: null,
    validUntil: null,
    warrantyYears: null,
    realizationStartDate: null,
    realizationEndDate: null,
    realizationStartTime: null,
    realizationEndTime: null,
    materialCompositionId: null,
    materialComposition: null,
    lineItems: [],
  }))
}
export async function deleteQuoteAlternative(id: string) {
  return deleteRequest(`/api/quote-alternatives/${id}`)
}
export async function updateQuoteAlternative(
  id: string,
  data: Partial<{
    label: string
    discountPercent: number
    description: string | null
    issuedDate: string | null
    validUntil: string | null
    warrantyYears: number | null
    realizationStartDate: string | null
    realizationEndDate: string | null
    realizationStartTime: string | null
    realizationEndTime: string | null
    materialCompositionId: string | null
  }>,
) {
  return patchJSON<QuoteAlternative>(`/api/quote-alternatives/${id}`, data)
}

function computeLineItemTotal(plannedQty: number, unitPrice: number, wastePercent: number) {
  return Math.round(plannedQty * unitPrice * (1 + wastePercent / 100) * 100) / 100
}

export async function createQuoteLineItem(data: {
  quoteAlternativeId: string
  description: string
  plannedQty?: number
  unitPriceSnapshot?: number
  wastePercent?: number
  unit?: string
  section?: 'main' | 'nad_ramec'
  source?: 'auto_calculated' | 'manual'
}) {
  const id = newId()
  return postJSON<QuoteLineItem>('/api/quote-line-items', { id, ...data }, () => ({
    id,
    quoteAlternativeId: data.quoteAlternativeId,
    description: data.description,
    plannedQty: String(data.plannedQty ?? 0),
    unit: data.unit ?? 'ks',
    unitPriceSnapshot: String(data.unitPriceSnapshot ?? 0),
    total: String(computeLineItemTotal(data.plannedQty ?? 0, data.unitPriceSnapshot ?? 0, data.wastePercent ?? 0)),
    wastePercent: String(data.wastePercent ?? 0),
    section: data.section ?? 'main',
    source: data.source ?? 'manual',
  }))
}
export async function updateQuoteLineItem(
  id: string,
  data: Partial<{ description: string; plannedQty: number; unitPriceSnapshot: number; wastePercent: number; unit: string; section: 'main' | 'nad_ramec'; total: number }>,
) {
  return patchJSON<QuoteLineItem>(`/api/quote-line-items/${id}`, data)
}
export async function deleteQuoteLineItem(id: string) {
  return deleteRequest(`/api/quote-line-items/${id}`)
}

export async function createInspectionPhoto(data: { inspectionId: string; url: string; caption?: string }) {
  return postJSON<InspectionPhoto>('/api/inspection-photos', { id: newId(), ...data })
}
export async function updateInspectionPhoto(id: string, data: Partial<{ caption: string | null; url: string }>) {
  return patchJSON<InspectionPhoto>(`/api/inspection-photos/${id}`, data)
}
export async function deleteInspectionPhoto(id: string) {
  return deleteRequest(`/api/inspection-photos/${id}`)
}

export async function saveInspectionSketch(data: { inspectionId: string; fileUrl: string }) {
  return postJSON<InspectionSketch>('/api/inspection-sketch', { id: newId(), ...data })
}
export async function deleteInspectionSketch(inspectionId: string) {
  return deleteRequest(`/api/inspection-sketch?inspectionId=${inspectionId}`)
}

export async function createRoofAreaSection(data: { inspectionId: string; label?: string; widthM: number; heightM: number }) {
  return postJSON<RoofAreaSection>('/api/roof-area-sections', { id: newId(), ...data })
}
export async function updateRoofAreaSection(id: string, data: Partial<{ label: string; widthM: number; heightM: number }>) {
  return patchJSON<RoofAreaSection>(`/api/roof-area-sections/${id}`, data)
}
export async function deleteRoofAreaSection(id: string) {
  return deleteRequest(`/api/roof-area-sections/${id}`)
}

export async function createAdditionalService(data: { inspectionId: string; description: string; photoUrl?: string }) {
  return postJSON<AdditionalService>('/api/additional-services', { id: newId(), ...data })
}
export async function updateAdditionalService(id: string, data: Partial<{ description: string; photoUrl: string | null }>) {
  return patchJSON<AdditionalService>(`/api/additional-services/${id}`, data)
}
export async function deleteAdditionalService(id: string) {
  return deleteRequest(`/api/additional-services/${id}`)
}

export async function fetchCompanySettings() {
  return offlineGet<CompanySettings | null>('/api/company-settings', 'Nepodarilo sa načítať firemné údaje.')
}
export async function updateCompanySettings(data: Partial<Omit<CompanySettings, 'id'>>) {
  return patchJSON<CompanySettings>('/api/company-settings', data)
}

export async function fetchPriceList() {
  return offlineGet<PriceListItem[]>('/api/price-list', 'Nepodarilo sa načítať cenník.')
}
export async function createPriceListItem(data: { itemKey: string; unit?: string; unitPrice: number; category: 'material' | 'prace'; validFrom?: string }) {
  return postJSON<PriceListItem>('/api/price-list', { id: newId(), ...data })
}
export async function updatePriceListItem(id: string, data: Partial<{ itemKey: string; unit: string; unitPrice: number; category: 'material' | 'prace'; validFrom: string }>) {
  return patchJSON<PriceListItem>(`/api/price-list/${id}`, data)
}
export async function deletePriceListItem(id: string) {
  return deleteRequest(`/api/price-list/${id}`)
}

export async function fetchTechnicians() {
  return offlineGet<Technician[]>('/api/technicians', 'Nepodarilo sa načítať technikov.')
}
export async function createTechnician(data: { name: string; email?: string }) {
  return postJSON<Technician>('/api/technicians', { id: newId(), ...data })
}
export async function updateTechnician(id: string, data: Partial<{ name: string; email: string | null }>) {
  return patchJSON<Technician>(`/api/technicians/${id}`, data)
}
export async function deleteTechnician(id: string) {
  return deleteRequest(`/api/technicians/${id}`)
}

export async function fetchMaterialCompositions() {
  return offlineGet<MaterialComposition[]>('/api/material-compositions', 'Nepodarilo sa načítať skladby.')
}
export async function createMaterialComposition(data: { name: string; layers?: string[]; workStepsTemplate?: string; warrantyYears?: number | null }) {
  return postJSON<MaterialComposition>('/api/material-compositions', { id: newId(), ...data })
}
export async function updateMaterialComposition(
  id: string,
  data: Partial<{ name: string; layers: string[]; workStepsTemplate: string | null; warrantyYears: number | null; featuredProductId: string | null }>,
) {
  return patchJSON<MaterialComposition>(`/api/material-compositions/${id}`, data)
}
export async function deleteMaterialComposition(id: string) {
  return deleteRequest(`/api/material-compositions/${id}`)
}

export async function fetchMaterialProducts() {
  return offlineGet<MaterialProduct[]>('/api/material-products', 'Nepodarilo sa načítať produkty.')
}
export async function createMaterialProduct(data: { name: string; description: string }) {
  return postJSON<MaterialProduct>('/api/material-products', { id: newId(), ...data })
}
export async function updateMaterialProduct(id: string, data: Partial<{ name: string; description: string }>) {
  return patchJSON<MaterialProduct>(`/api/material-products/${id}`, data)
}
export async function deleteMaterialProduct(id: string) {
  return deleteRequest(`/api/material-products/${id}`)
}

export async function fetchDocumentTemplates() {
  return offlineGet<DocumentTemplate[]>('/api/document-templates', 'Nepodarilo sa načítať šablóny.')
}
export async function createDocumentTemplate(data: { key: string; title: string; content?: string }) {
  return postJSON<DocumentTemplate>('/api/document-templates', { id: newId(), ...data })
}
export async function updateDocumentTemplate(id: string, data: Partial<{ key: string; title: string; content: string }>) {
  return patchJSON<DocumentTemplate>(`/api/document-templates/${id}`, data)
}
export async function deleteDocumentTemplate(id: string) {
  return deleteRequest(`/api/document-templates/${id}`)
}

export async function fetchCalendarEvents(params: { from: string; to: string }) {
  const search = new URLSearchParams({ from: params.from, to: params.to })
  return offlineGet<CalendarEvent[]>(`/api/calendar-events?${search.toString()}`, 'Nepodarilo sa načítať udalosti kalendára.')
}
export async function createCalendarEvent(data: {
  title: string
  date: string
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  notes?: string | null
}) {
  const id = newId()
  return postJSON<CalendarEvent>('/api/calendar-events', { id, ...data }, () => ({
    id,
    title: data.title,
    date: data.date,
    startTime: data.startTime ?? null,
    endTime: data.endTime ?? null,
    location: data.location ?? null,
    notes: data.notes ?? null,
  }))
}
export async function updateCalendarEvent(
  id: string,
  data: Partial<{ title: string; date: string; startTime: string | null; endTime: string | null; location: string | null; notes: string | null }>,
) {
  return patchJSON<CalendarEvent>(`/api/calendar-events/${id}`, data)
}
export async function deleteCalendarEvent(id: string) {
  return deleteRequest(`/api/calendar-events/${id}`)
}
