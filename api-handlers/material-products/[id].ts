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
    const { name, description } = req.body || {}
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim()
    if (description !== undefined) data.description = String(description).trim()

    try {
      const item = await prisma.materialProduct.update({ where: { id }, data })
      return res.status(200).json(item)
    } catch {
      return res.status(404).json({ error: 'Produkt nebol nájdený.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.materialProduct.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Produkt nebol nájdený.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
