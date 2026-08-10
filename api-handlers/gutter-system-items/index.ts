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
  if (req.method === 'POST') {
    const { id, inspectionId, itemType, quantity, unit } = req.body || {}

    if (typeof inspectionId !== 'string' || !inspectionId) {
      return res.status(400).json({ error: 'Chýba inspectionId.' })
    }
    if (typeof itemType !== 'string' || !itemType.trim()) {
      return res.status(400).json({ error: 'Typ položky je povinný.' })
    }
    const qty = Number(quantity)
    if (Number.isNaN(qty)) {
      return res.status(400).json({ error: 'Množstvo musí byť číslo.' })
    }

    const item = await prisma.gutterSystemItem.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        inspectionId,
        itemType: itemType.trim(),
        quantity: qty,
        unit: typeof unit === 'string' && unit.trim() ? unit.trim() : 'ks',
      },
    })

    return res.status(201).json(item)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
