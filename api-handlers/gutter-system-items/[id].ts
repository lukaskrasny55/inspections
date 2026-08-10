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
    const { itemType, quantity, unit } = req.body || {}
    const data: Record<string, unknown> = {}
    if (itemType !== undefined) data.itemType = String(itemType).trim()
    if (quantity !== undefined) {
      const qty = Number(quantity)
      if (Number.isNaN(qty)) return res.status(400).json({ error: 'Množstvo musí byť číslo.' })
      data.quantity = qty
    }
    if (unit !== undefined) data.unit = String(unit).trim()

    try {
      const item = await prisma.gutterSystemItem.update({ where: { id }, data })
      return res.status(200).json(item)
    } catch {
      return res.status(404).json({ error: 'Záznam nebol nájdený.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.gutterSystemItem.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Záznam nebol nájdený.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
