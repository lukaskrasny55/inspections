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

const VALID_CATEGORIES = ['material', 'prace', 'ine']

// No DELETE here on purpose: deactivate (isActive: false) instead of removing,
// so historical quote line items that already snapshotted a price for this
// item keep working. A hard delete would also violate the FK from
// technical_solution_items for any inspection that ever used the item.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined
  if (!id) return res.status(400).json({ error: 'Chýba id.' })

  if (req.method === 'PATCH') {
    const { name, unit, defaultUnitPrice, category, isActive } = req.body || {}
    const data: Record<string, unknown> = {}

    if (name !== undefined) {
      const trimmed = String(name).trim()
      if (!trimmed) return res.status(400).json({ error: 'Názov položky je povinný.' })
      data.name = trimmed
    }
    if (unit !== undefined) data.unit = String(unit).trim() || 'ks'
    if (defaultUnitPrice !== undefined) {
      const price = Number(defaultUnitPrice)
      if (Number.isNaN(price)) return res.status(400).json({ error: 'Cena musí byť číslo.' })
      data.defaultUnitPrice = price
    }
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Neplatná kategória.' })
      data.category = category
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    try {
      const item = await prisma.checklistItemCatalog.update({ where: { id }, data })
      return res.status(200).json(item)
    } catch {
      return res.status(404).json({ error: 'Položka nebola nájdená.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
