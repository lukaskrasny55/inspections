import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../lib/prisma.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
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

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export async function fetchPlanEvents(range?: { gte: Date; lte: Date }): Promise<PlanEvent[]> {
  const inspectionsWithVisit = await prisma.inspection.findMany({
    where: range ? { inspectionDate: range } : { inspectionDate: { not: null } },
    include: { customer: true, technician: true },
  })

  const alternativesWithRealization = await prisma.quoteAlternative.findMany({
    where: range
      ? {
          OR: [{ realizationStartDate: range }, { realizationEndDate: range }],
        }
      : { realizationStartDate: { not: null } },
    include: { inspection: { include: { customer: true, technician: true } } },
  })

  const calendarEvents = await prisma.calendarEvent.findMany({
    where: range ? { date: range } : undefined,
  })

  const events: PlanEvent[] = []

  for (const insp of inspectionsWithVisit) {
    if (!insp.inspectionDate) continue
    events.push({
      id: `obhliadka-${insp.id}`,
      type: 'obhliadka',
      date: insp.inspectionDate.toISOString(),
      endDate: null,
      time: insp.inspectionTime,
      endTime: null,
      location: insp.customer.siteAddress || insp.customer.address,
      inspectionId: insp.id,
      referenceNumber: insp.referenceNumber,
      customerName: insp.customer.name,
      technicianName: insp.technician?.name ?? null,
      label: null,
      title: null,
      notes: null,
    })
  }

  for (const alt of alternativesWithRealization) {
    if (!alt.realizationStartDate) continue
    events.push({
      id: `realizacia-${alt.id}`,
      type: 'realizacia',
      date: alt.realizationStartDate.toISOString(),
      endDate: alt.realizationEndDate ? alt.realizationEndDate.toISOString() : null,
      time: alt.realizationStartTime,
      endTime: alt.realizationEndTime,
      location: alt.inspection.customer.siteAddress || alt.inspection.customer.address,
      inspectionId: alt.inspection.id,
      referenceNumber: alt.inspection.referenceNumber,
      customerName: alt.inspection.customer.name,
      technicianName: alt.inspection.technician?.name ?? null,
      label: alt.label,
      title: null,
      notes: null,
    })
  }

  for (const ev of calendarEvents) {
    events.push({
      id: `ine-${ev.id}`,
      type: 'ine',
      date: ev.date.toISOString(),
      endDate: null,
      time: ev.startTime,
      endTime: ev.endTime,
      location: ev.location,
      inspectionId: null,
      referenceNumber: null,
      customerName: null,
      technicianName: null,
      label: null,
      title: ev.title,
      notes: ev.notes,
    })
  }

  events.sort((a, b) => a.date.localeCompare(b.date))

  return events
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const from = param(req.query.from)
  const to = param(req.query.to)
  const range = from && to ? { gte: new Date(from), lte: new Date(`${to}T23:59:59`) } : undefined

  const events = await fetchPlanEvents(range)
  return res.status(200).json(events)
}
