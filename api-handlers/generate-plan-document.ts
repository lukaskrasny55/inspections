import type { IncomingMessage, ServerResponse } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import PDFDocument from 'pdfkit'
import { fetchPlanEvents } from './plan.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FONT_REGULAR = path.join(__dirname, '../assets/fonts/DejaVuSans.ttf')
const FONT_BOLD = path.join(__dirname, '../assets/fonts/DejaVuSans-Bold.ttf')

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

const TYPE_LABEL: Record<string, string> = {
  obhliadka: 'Obhliadka',
  realizacia: 'Realizácia',
  ine: 'Iné',
}

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function formatDate(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const from = param(req.query.from)
  const to = param(req.query.to)
  if (!from || !to) {
    return res.status(400).json({ error: 'Chýba parameter from alebo to.' })
  }

  const range = { gte: new Date(from), lte: new Date(`${to}T23:59:59`) }
  const events = await fetchPlanEvents(range)

  // A multi-day realizácia carries one PlanEvent with a start/end date — expand it
  // across every day it spans so the PDF lists it on each day, matching the
  // calendar view instead of only showing it on its first day.
  const eventsByDay = new Map<string, typeof events>()
  for (const ev of events) {
    const start = new Date(ev.date)
    start.setHours(0, 0, 0, 0)
    const end = ev.endDate ? new Date(ev.endDate) : start
    end.setHours(0, 0, 0, 0)
    const cursor = new Date(start)
    while (cursor <= end) {
      const dayKey = toISODate(cursor)
      const bucket = eventsByDay.get(dayKey)
      if (bucket) bucket.push(ev)
      else eventsByDay.set(dayKey, [ev])
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  const sortedDays = [...eventsByDay.keys()].sort()

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  doc.registerFont('Regular', FONT_REGULAR)
  doc.registerFont('Bold', FONT_BOLD)
  doc.font('Regular')

  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))

  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  doc.font('Bold').fontSize(18).text('TMS Hydra — Plán činností', { align: 'left' })
  doc.font('Regular').fontSize(11).fillColor('#6b7280').text(`Obdobie: ${from} — ${to}`)
  doc.moveDown(1)
  doc.fillColor('#111827')

  if (sortedDays.length === 0) {
    doc.fontSize(12).text('V danom období nie sú naplánované žiadne činnosti.')
  }

  for (const dayKey of sortedDays) {
    const dayEvents = eventsByDay.get(dayKey)!
    doc.moveDown(0.5)
    doc.font('Bold').fontSize(13).fillColor('#111827').text(formatDate(dayKey), { underline: true })
    doc.font('Regular').moveDown(0.2)

    for (const ev of dayEvents) {
      const label = TYPE_LABEL[ev.type] || ev.type
      const name = ev.customerName || ev.title || ''
      const timeRange = ev.time ? `${ev.time}${ev.endTime ? `–${ev.endTime}` : ''}` : ''

      doc.font('Bold').fontSize(11).fillColor('#111827').text(`${label}: ${name}`, { continued: false })
      const details: string[] = []
      if (timeRange) details.push(`Čas: ${timeRange}`)
      if (ev.location) details.push(`Miesto: ${ev.location}`)
      if (ev.technicianName) details.push(`Technik: ${ev.technicianName}`)
      if (ev.referenceNumber) details.push(`Č. obhliadky: ${ev.referenceNumber}`)
      if (details.length > 0) {
        doc.font('Regular').fontSize(10).fillColor('#6b7280').text(details.join('   •   '))
      }
      doc.moveDown(0.4)
    }
  }

  doc.end()
  const buffer = await done

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="plan-${from}_${to}.pdf"`)
  res.end(buffer)
}
