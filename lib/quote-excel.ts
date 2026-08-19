import ExcelJS from 'exceljs'
import { prisma } from './prisma.js'

const MONTHS_SK = [
  'január', 'február', 'marec', 'apríl', 'máj', 'jún',
  'júl', 'august', 'september', 'október', 'november', 'december',
]

function formatDate(value: Date | null): string {
  if (!value) return ''
  const d = new Date(value)
  return `${d.getDate()} ${MONTHS_SK[d.getMonth()]} ${d.getFullYear()}`
}

function sectionTotals(items: { total: unknown }[], discountPercent: number) {
  const subtotal = items.reduce((sum, li) => sum + Number(li.total), 0)
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100
  const totalAfterDiscount = Math.round((subtotal - discountAmount) * 100) / 100
  return { subtotal, discountAmount, totalAfterDiscount }
}

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2761' } }
const TOTAL_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E9F5' } }
const MONEY_FMT = '#,##0.00 "€"'

export async function buildQuoteExcel(id: string) {
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

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'TMS Hydra'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Cenová ponuka', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  })
  sheet.columns = [
    { width: 48 },
    { width: 12 },
    { width: 10 },
    { width: 14 },
    { width: 10 },
    { width: 14 },
  ]

  let row = 1
  function title(text: string, size = 14, bold = true) {
    const cell = sheet.getCell(row, 1)
    sheet.mergeCells(row, 1, row, 6)
    cell.value = text
    cell.font = { size, bold }
    row += 1
  }
  function infoLine(label: string, value: string) {
    if (!value) {
      row += 1
      return
    }
    sheet.getCell(row, 1).value = label
    sheet.getCell(row, 1).font = { bold: true }
    sheet.getCell(row, 2).value = value
    sheet.mergeCells(row, 2, row, 6)
    row += 1
  }

  title(`Cenová ponuka – alternatíva ${alternative.label}`, 16)
  if (alternative.description) title(alternative.description, 11, false)
  row += 1
  infoLine('Číslo diela:', alternative.inspection.referenceNumber)
  infoLine('Zákazník:', customer.name)
  infoLine('Telefón:', customer.phone ?? '')
  infoLine('Email:', customer.email ?? '')
  infoLine('Adresa:', customer.address ?? '')
  infoLine('Miesto realizácie:', customer.siteAddress || customer.address || '')
  infoLine('Dátum vystavenia:', formatDate(alternative.issuedDate))
  infoLine('Platí do:', formatDate(alternative.validUntil))
  infoLine('Záruka (roky):', alternative.warrantyYears !== null ? String(alternative.warrantyYears) : '')
  if (company?.ico) infoLine('IČO:', company.ico)
  if (company?.dic) infoLine('DIČ:', company.dic)
  row += 1

  function itemsTable(heading: string, items: typeof mainItems, totals: ReturnType<typeof sectionTotals>) {
    title(heading, 12)
    const headerRow = row
    const headers = ['Popis', 'Množstvo', 'Jednotky', 'Jedn. cena (€)', 'Stratné (%)', 'Celkom (€)']
    headers.forEach((h, i) => {
      const cell = sheet.getCell(headerRow, i + 1)
      cell.value = h
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER_FILL
      cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center' }
    })
    row += 1

    if (items.length === 0) {
      sheet.getCell(row, 1).value = '— žiadne položky —'
      sheet.getCell(row, 1).font = { italic: true, color: { argb: 'FF64748B' } }
      sheet.mergeCells(row, 1, row, 6)
      row += 1
    }

    for (const li of items) {
      sheet.getCell(row, 1).value = li.description
      sheet.getCell(row, 2).value = li.plannedQty !== null ? Number(li.plannedQty) : null
      sheet.getCell(row, 3).value = li.unit
      sheet.getCell(row, 4).value = Number(li.unitPriceSnapshot)
      sheet.getCell(row, 4).numFmt = MONEY_FMT
      sheet.getCell(row, 5).value = li.wastePercent !== null ? Number(li.wastePercent) : 0
      sheet.getCell(row, 5).numFmt = '0"%"'
      sheet.getCell(row, 6).value = Number(li.total)
      sheet.getCell(row, 6).numFmt = MONEY_FMT
      ;[2, 3, 5].forEach((c) => (sheet.getCell(row, c).alignment = { horizontal: 'center' }))
      row += 1
    }

    const summaryRows: [string, number][] = [
      ['Spolu', totals.subtotal],
      [`Zľava ${discountPercent}%`, -totals.discountAmount],
      ['Celkom na úhradu', totals.totalAfterDiscount],
    ]
    summaryRows.forEach(([label, value], i) => {
      const isLast = i === summaryRows.length - 1
      sheet.getCell(row, 5).value = label
      sheet.getCell(row, 5).font = { bold: isLast }
      sheet.getCell(row, 5).alignment = { horizontal: 'right' }
      const cell = sheet.getCell(row, 6)
      cell.value = value
      cell.numFmt = MONEY_FMT
      cell.font = { bold: isLast }
      if (isLast) {
        sheet.getCell(row, 5).fill = TOTAL_FILL
        cell.fill = TOTAL_FILL
      }
      row += 1
    })
    row += 1
  }

  itemsTable('Hydroizolačné a zatepľovacie práce', mainItems, mainTotals)
  itemsTable('Tesárske a klampiarske práce (nad rámec)', nadRamecItems, nadRamecTotals)

  title('Celkom na úhradu (obe sekcie)', 12)
  const grandRows: [string, number][] = [
    ['Spolu', grandSubtotal],
    [`Zľava ${discountPercent}%`, -grandDiscountAmount],
    ['Celkom na úhradu', grandTotal],
  ]
  grandRows.forEach(([label, value], i) => {
    const isLast = i === grandRows.length - 1
    sheet.getCell(row, 5).value = label
    sheet.getCell(row, 5).font = { bold: true }
    sheet.getCell(row, 5).alignment = { horizontal: 'right' }
    const cell = sheet.getCell(row, 6)
    cell.value = value
    cell.numFmt = MONEY_FMT
    cell.font = { bold: true, size: isLast ? 12 : 11 }
    if (isLast) {
      sheet.getCell(row, 5).fill = TOTAL_FILL
      cell.fill = TOTAL_FILL
    }
    row += 1
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `Cenova-ponuka-${alternative.label}-${alternative.inspection.referenceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.xlsx`

  return { buffer: Buffer.from(buffer), filename }
}
