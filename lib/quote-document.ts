import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { prisma } from './prisma.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = path.join(__dirname, '../templates/cenova-ponuka.docx')

const MONTHS_SK = [
  'január', 'február', 'marec', 'apríl', 'máj', 'jún',
  'júl', 'august', 'september', 'október', 'november', 'december',
]

function formatDate(value: Date | null): string {
  if (!value) return ''
  const d = new Date(value)
  return `${d.getDate()} ${MONTHS_SK[d.getMonth()]} ${d.getFullYear()}`
}

function decimalToComma(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace('.', ',')
}

function formatMoney(value: number): string {
  const fixed = value.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${withSpaces},${decPart}`
}

function formatPrice(value: unknown): string {
  return formatMoney(Number(value ?? 0))
}

function sectionTotals(items: { total: unknown }[], discountPercent: number) {
  const subtotal = items.reduce((sum, li) => sum + Number(li.total), 0)
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100
  const totalAfterDiscount = Math.round((subtotal - discountAmount) * 100) / 100
  return { subtotal, discountAmount, totalAfterDiscount }
}

export async function buildQuoteDocument(id: string) {
  const alternative = await prisma.quoteAlternative.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { sequenceOrder: 'asc' } },
      inspection: { include: { customer: true } },
    },
  })

  if (!alternative) return null

  const company = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })

  const { customer } = alternative.inspection
  const discountPercent = Number(alternative.discountPercent)

  const mainItems = alternative.lineItems.filter((li) => li.section === 'main')
  const nadRamecItems = alternative.lineItems.filter((li) => li.section === 'nad_ramec')
  const mainTotals = sectionTotals(mainItems, discountPercent)
  const nadRamecTotals = sectionTotals(nadRamecItems, discountPercent)
  const grandSubtotal = mainTotals.subtotal + nadRamecTotals.subtotal
  const grandDiscountAmount = Math.round(grandSubtotal * (discountPercent / 100) * 100) / 100
  const grandTotal = Math.round((grandSubtotal - grandDiscountAmount) * 100) / 100

  function mapItem(li: (typeof mainItems)[number]) {
    return {
      popis: li.description,
      naplanovane: li.plannedQty !== null ? `${decimalToComma(li.plannedQty)}${li.unit}` : '',
      celkom_mnozstvo: li.plannedQty !== null ? `${decimalToComma(li.plannedQty)}${li.unit}` : '',
      jednotkova_cena: formatPrice(li.unitPriceSnapshot),
      jednotky: li.unit,
      riadok_celkom: formatPrice(li.total),
    }
  }

  const data = {
    alternativa_label: alternative.label,
    alternativa_popis: alternative.description ?? '',
    datum_vystavenia: formatDate(alternative.issuedDate),
    plati_do: formatDate(alternative.validUntil),
    cislo_diela: alternative.inspection.referenceNumber,
    zakaznik_meno: customer.name,
    zakaznik_telefon: customer.phone ?? '',
    zakaznik_email: customer.email ?? '',
    zakaznik_adresa: customer.address ?? '',
    pracovisko: customer.siteAddress || customer.address || '',
    zaruka_roky: alternative.warrantyYears !== null ? String(alternative.warrantyYears) : '',
    firma_ico: company?.ico ?? '',
    firma_dic: company?.dic ?? '',
    firma_iban: company?.iban ?? '',
    firma_bic: company?.bic ?? '',
    hlavne_polozky: mainItems.map(mapItem),
    doplnkove_polozky: nadRamecItems.map(mapItem),
    hlavne_spolu: formatMoney(mainTotals.subtotal),
    hlavne_zlava_suma: formatMoney(mainTotals.discountAmount),
    hlavne_celkom_uhrada: formatMoney(mainTotals.totalAfterDiscount),
    nad_ramec_spolu: formatMoney(nadRamecTotals.subtotal),
    nad_ramec_zlava_suma: formatMoney(nadRamecTotals.discountAmount),
    nad_ramec_celkom_uhrada: formatMoney(nadRamecTotals.totalAfterDiscount),
    zlava_percent: String(discountPercent),
    celkovy_spolu: formatMoney(grandSubtotal),
    celkova_zlava_suma: formatMoney(grandDiscountAmount),
    celkom_na_uhradu: formatMoney(grandTotal),
  }

  const templateBuffer = fs.readFileSync(TEMPLATE_PATH)
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })

  doc.render(data)

  const buffer: Buffer = doc.getZip().generate({ type: 'nodebuffer' })
  const filename = `Cenova-ponuka-${alternative.label}-${alternative.inspection.referenceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.docx`

  return { buffer, filename, alternative, customer }
}
