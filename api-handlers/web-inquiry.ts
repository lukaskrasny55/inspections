import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../lib/prisma.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

function clean(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

// Start-of-day (server local time) so the calendar event lands on "today" in
// the Plán day list regardless of what time of day the inquiry came in.
function todayAtMidnight(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function buildNotes(fields: { message: string | null; email: string | null; phone: string | null; address: string | null; source: string | null }): string {
  const lines: string[] = []
  if (fields.phone) lines.push(`Telefón: ${fields.phone}`)
  if (fields.email) lines.push(`Email: ${fields.email}`)
  if (fields.address) lines.push(`Adresa: ${fields.address}`)
  if (fields.source) lines.push(`Zdroj: ${fields.source}`)
  if (fields.message) lines.push('', fields.message)
  return lines.join('\n')
}

// Receives new leads forwarded from tmshydra.com (contact form, price
// calculator, booking). Every inquiry gets: (1) a WebInquiry row so it can
// later be turned into a scheduled Inspection from the app, and (2) a
// same-day CalendarEvent titled "Nový dopyt" so it shows up in Plán —
// including on a phone — the moment it arrives, without anyone having to go
// looking for it.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const expectedSecret = process.env.INSPECTIONS_WEBHOOK_SECRET
  if (!expectedSecret) {
    // Fail closed: an unconfigured secret must never mean "accept anything".
    return res.status(500).json({ error: 'Webhook nie je nakonfigurovaný.' })
  }
  const authHeader = req.headers.authorization
  const provided = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : ''
  if (provided !== expectedSecret) {
    return res.status(401).json({ error: 'Neplatný token.' })
  }

  const body = req.body || {}
  const name = clean(body.name)
  if (!name) {
    return res.status(400).json({ error: 'Meno je povinné.' })
  }
  const email = clean(body.email)
  const phone = clean(body.phone)
  const address = clean(body.address)
  const message = clean(body.message)
  const source = clean(body.source)

  // Best-effort dedupe against an existing customer by phone, then email —
  // avoids piling up duplicate Customer rows every time the same person
  // submits more than one form. No match just means a new customer.
  let customer = null as null | { id: string }
  if (phone) {
    customer = await prisma.customer.findFirst({ where: { phone } })
  }
  if (!customer && email) {
    customer = await prisma.customer.findFirst({ where: { email } })
  }
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name, phone, email, address },
    })
  }

  const inquiry = await prisma.webInquiry.create({
    data: {
      customerId: customer.id,
      name,
      email: email ?? '',
      phone,
      address,
      message,
      source,
    },
  })

  const event = await prisma.calendarEvent.create({
    data: {
      title: `Nový dopyt: ${name}`,
      date: todayAtMidnight(),
      notes: buildNotes({ message, email, phone, address, source }),
    },
  })

  return res.status(201).json({ webInquiryId: inquiry.id, calendarEventId: event.id })
}
