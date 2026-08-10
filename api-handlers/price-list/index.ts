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
  if (req.method === 'GET') {
    const items = await prisma.priceListItem.findMany({ orderBy: { itemKey: 'asc' } })
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    const { id, itemKey, unit, unitPrice, category, validFrom } = req.body || {}

    if (typeof itemKey !== 'string' || !itemKey.trim()) {
      return res.status(400).json({ error: 'Kľúč položky je povinný.' })
    }
    const price = Number(unitPrice)
    if (Number.isNaN(price)) {
      return res.status(400).json({ error: 'Cena musí byť číslo.' })
    }
    if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Neplatná kategória.' })
    }

    const item = await prisma.priceListItem.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        itemKey: itemKey.trim(),
        unit: typeof unit === 'string' && unit.trim() ? unit.trim() : 'ks',
        unitPrice: price,
        category: category as 'material' | 'prace',
        validFrom: validFrom ? new Date(validFrom) : new Date(),
      },
    })

    return res.status(201).json(item)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
