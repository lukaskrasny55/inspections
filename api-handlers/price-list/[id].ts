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

const VALID_CATEGORIES = ['material', 'prace']

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined
  if (!id) return res.status(400).json({ error: 'Chýba id.' })

  if (req.method === 'PATCH') {
    const { itemKey, unit, unitPrice, category, validFrom } = req.body || {}
    const data: Record<string, unknown> = {}

    if (itemKey !== undefined) data.itemKey = String(itemKey).trim()
    if (unit !== undefined) data.unit = String(unit).trim()
    if (unitPrice !== undefined) {
      const price = Number(unitPrice)
      if (Number.isNaN(price)) return res.status(400).json({ error: 'Cena musí byť číslo.' })
      data.unitPrice = price
    }
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Neplatná kategória.' })
      data.category = category
    }
    if (validFrom !== undefined) data.validFrom = new Date(validFrom)

    try {
      const item = await prisma.priceListItem.update({ where: { id }, data })
      return res.status(200).json(item)
    } catch {
      return res.status(404).json({ error: 'Položka nebola nájdená.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.priceListItem.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Položka nebola nájdená.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
