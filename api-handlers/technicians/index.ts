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
  if (req.method === 'GET') {
    const technicians = await prisma.technician.findMany({ orderBy: { name: 'asc' } })
    return res.status(200).json(technicians)
  }

  if (req.method === 'POST') {
    const { id, name, email } = req.body || {}

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Meno je povinné.' })
    }

    try {
      const technician = await prisma.technician.create({
        data: {
          id: typeof id === 'string' && id ? id : undefined,
          name: name.trim(),
          email: typeof email === 'string' && email.trim() ? email.trim() : null,
        },
      })
      return res.status(201).json(technician)
    } catch {
      return res.status(409).json({ error: 'Technik s týmto emailom už existuje.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
