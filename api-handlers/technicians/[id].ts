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
    const { name, email } = req.body || {}
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim()
    if (email !== undefined) data.email = typeof email === 'string' && email.trim() ? email.trim() : null

    try {
      const technician = await prisma.technician.update({ where: { id }, data })
      return res.status(200).json(technician)
    } catch {
      return res.status(404).json({ error: 'Technik nebol nájdený.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.technician.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Technik nebol nájdený.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
