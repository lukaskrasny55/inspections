import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../../lib/prisma.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'GET') {
    const from = param(req.query.from)
    const to = param(req.query.to)
    const range = from && to ? { gte: new Date(from), lte: new Date(`${to}T23:59:59`) } : undefined

    const events = await prisma.calendarEvent.findMany({
      where: range ? { date: range } : undefined,
      orderBy: { date: 'asc' },
    })
    return res.status(200).json(events)
  }

  if (req.method === 'POST') {
    const { id, title, date, startTime, endTime, location, notes } = req.body || {}

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Názov udalosti je povinný.' })
    }
    if (typeof date !== 'string' || !date) {
      return res.status(400).json({ error: 'Dátum je povinný.' })
    }

    const event = await prisma.calendarEvent.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        title: title.trim(),
        date: new Date(date),
        startTime: typeof startTime === 'string' && startTime.trim() ? startTime.trim() : null,
        endTime: typeof endTime === 'string' && endTime.trim() ? endTime.trim() : null,
        location: typeof location === 'string' && location.trim() ? location.trim() : null,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      },
    })
    return res.status(201).json(event)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
