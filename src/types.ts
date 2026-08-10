export type InspectionStatus = 'draft' | 'ready_for_quote' | 'sent' | 'archived'

export const STATUS_LABELS: Record<InspectionStatus, string> = {
  draft: 'Rozpracované',
  ready_for_quote: 'Pripravené na odoslanie',
  sent: 'Odoslané',
  archived: 'Archivované',
}

export interface Customer {
  id: string
  name: string
  address: string | null
  siteAddress: string | null
  phone: string | null
  email: string | null
  buildingAdmin: string | null
}

export interface CompanySettings {
  id: string
  ico: string | null
  dic: string | null
  iban: string | null
  bic: string | null
  address: string | null
  email: string | null
  phone: string | null
  logoUrl: string | null
}

export type PriceCategory = 'material' | 'prace'

export interface PriceListItem {
  id: string
  itemKey: string
  unit: string
  unitPrice: string
  category: PriceCategory
  validFrom: string
}

export interface RoofEdge {
  id: string
  label: string
  lengthM: string
  atikaHeightCm: string | null
}

export interface RoofAreaSection {
  id: string
  label: string
  widthM: string
  heightM: string
  areaM2: string
}

export type ChecklistItemCategory = 'material' | 'prace' | 'ine'
export type ChecklistItemSource = 'system_default' | 'custom_added'

export interface ChecklistItemCatalog {
  id: string
  name: string
  unit: string
  defaultUnitPrice: string
  category: ChecklistItemCategory
  isActive: boolean
  source: ChecklistItemSource
  createdAt: string
}

export interface TechnicalSolutionItem {
  id: string
  catalogItemId: string
  catalogItem: ChecklistItemCatalog
  isChecked: boolean
  valueNumber: string | null
  notes: string | null
}

export interface DrainDownspout {
  id: string
  label: string
  lengthM: string
}

export interface GutterSystemItem {
  id: string
  itemType: string
  quantity: string
  unit: string
}

export interface AdditionalService {
  id: string
  description: string
  photoUrl: string | null
}

export interface Technician {
  id: string
  name: string
  email: string | null
}

export interface MaterialProduct {
  id: string
  name: string
  description: string
}

export interface MaterialComposition {
  id: string
  name: string
  layersJson: string[]
  workStepsTemplate: string | null
  warrantyYears: number | null
  featuredProductId: string | null
  featuredProduct: MaterialProduct | null
}

export interface DocumentTemplate {
  id: string
  key: string
  title: string
  content: string
}

export interface InspectionPhoto {
  id: string
  url: string
  caption: string | null
}

export interface InspectionSketch {
  id: string
  fileUrl: string | null
  sketchJson: unknown
}

export type LineItemSection = 'main' | 'nad_ramec'
export type LineItemSource = 'auto_calculated' | 'manual'

export interface QuoteLineItem {
  id: string
  description: string
  plannedQty: string | null
  wastePercent: string | null
  unit: string
  unitPriceSnapshot: string
  total: string
  section: LineItemSection
  source: LineItemSource
}

export interface QuoteAlternative {
  id: string
  label: string
  description: string | null
  discountPercent: string
  totalPrice: string | null
  issuedDate: string | null
  validUntil: string | null
  warrantyYears: number | null
  realizationStartDate: string | null
  realizationEndDate: string | null
  realizationStartTime: string | null
  realizationEndTime: string | null
  materialCompositionId: string | null
  materialComposition: MaterialComposition | null
  lineItems: QuoteLineItem[]
}

export interface InspectionListItem {
  id: string
  referenceNumber: string
  status: InspectionStatus
  inspectionDate: string | null
  inspectionTime: string | null
  areaM2: string | null
  createdAt: string
  updatedAt: string
  customer: Customer
}

export interface WorkSummaryItem {
  id: string
  label: string
  customerName: string
  referenceNumber: string
  realizationEndDate: string | null
  areaM2: number | null
  revenue: number
}

export interface WorkSummary {
  count: number
  totalAreaM2: number
  totalRevenue: number
  items: WorkSummaryItem[]
}

export interface PlanEvent {
  id: string
  type: 'obhliadka' | 'realizacia' | 'ine'
  date: string
  endDate: string | null
  time: string | null
  endTime: string | null
  location: string | null
  inspectionId: string | null
  referenceNumber: string | null
  customerName: string | null
  technicianName: string | null
  label: string | null
  title: string | null
  notes: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  startTime: string | null
  endTime: string | null
  location: string | null
  notes: string | null
}

export interface InspectionDetail extends InspectionListItem {
  currentStateDescription: string | null
  isInsulated: boolean | null
  technicianId: string | null
  technician: Technician | null
  photos: InspectionPhoto[]
  sketch: InspectionSketch | null
  roofEdges: RoofEdge[]
  roofAreaSections: RoofAreaSection[]
  technicalSolutionItems: TechnicalSolutionItem[]
  drainDownspouts: DrainDownspout[]
  gutterSystemItems: GutterSystemItem[]
  additionalServices: AdditionalService[]
  quoteAlternatives: QuoteAlternative[]
}
