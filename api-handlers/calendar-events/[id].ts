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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined
  if (!id) return res.status(400).json({ error: 'Chýba id.' })

  if (req.method === 'PATCH') {
    const body = req.body || {}
    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = String(body.title).trim()
    if (body.date !== undefined) data.date = new Date(body.date)
    if (body.startTime !== undefined) data.startTime = body.startTime ? String(body.startTime).trim() : null
    if (body.endTime !== undefined) data.endTime = body.endTime ? String(body.endTime).trim() : null
    if (body.location !== undefined) data.location = body.location ? String(body.location).trim() : null
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null

    try {
      const event = await prisma.calendarEvent.update({ where: { id }, data })
      return res.status(200).json(event)
    } catch {
      return res.status(404).json({ error: 'Udalosť nebola nájdená.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.calendarEvent.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Udalosť nebola nájdená.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
