import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../lib/prisma.js'
import { ensureCalendarSchema } from '../lib/ensure-schema.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

// Turns a web inquiry (the "Nový dopyt" card in Plán) into a scheduled site
// visit: creates (or re-dates) the linked obhliadka so it shows up in the
// calendar next to the inquiry, in the same colour. The inquiry is marked as
// handled because agreeing a visit means the customer has been answered.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  await ensureCalendarSchema()

  const { calendarEventId, date, time } = req.body || {}
  if (typeof calendarEventId !== 'string' || !calendarEventId) {
    return res.status(400).json({ error: 'Chýba dopyt.' })
  }
  if (typeof date !== 'string' || !date || Number.isNaN(new Date(date).getTime())) {
    return res.status(400).json({ error: 'Dátum obhliadky je povinný.' })
  }
  const visitTime = typeof time === 'string' && time.trim() ? time.trim() : null

  const event = await prisma.calendarEvent.findUnique({ where: { id: calendarEventId } })
  if (!event || !event.webInquiryId) {
    return res.status(404).json({ error: 'Dopyt nebol nájdený.' })
  }
  const inquiry = await prisma.webInquiry.findUnique({ where: { id: event.webInquiryId } })
  if (!inquiry) {
    return res.status(404).json({ error: 'Dopyt nebol nájdený.' })
  }

  let inspection = await prisma.inspection.findUnique({ where: { webInquiryId: inquiry.id } })
  if (inspection) {
    inspection = await prisma.inspection.update({
      where: { id: inspection.id },
      data: { inspectionDate: new Date(date), inspectionTime: visitTime, reminderSentAt: null },
    })
  } else {
    let customerId = inquiry.customerId
    if (!customerId) {
      const customer = await prisma.customer.create({
        data: { name: inquiry.name, phone: inquiry.phone, email: inquiry.email || null, address: inquiry.address },
      })
      customerId = customer.id
    }
    const year = new Date().getFullYear()
    const count = await prisma.inspection.count({
      where: { createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    })
    let seq = count + 1
    let referenceNumber = `OBH-${String(seq).padStart(3, '0')}/${year}`
    while (await prisma.inspection.findUnique({ where: { referenceNumber } })) {
      seq += 1
      referenceNumber = `OBH-${String(seq).padStart(3, '0')}/${year}`
    }
    inspection = await prisma.inspection.create({
      data: {
        customerId,
        webInquiryId: inquiry.id,
        referenceNumber,
        status: 'draft',
        inspectionDate: new Date(date),
        inspectionTime: visitTime,
      },
    })
  }

  if (event.inquiryStage === null || event.inquiryStage === 'new') {
    await prisma.calendarEvent.update({ where: { id: event.id }, data: { inquiryStage: 'handled' } })
  }

  return res.status(200).json({ inspectionId: inspection.id })
}
