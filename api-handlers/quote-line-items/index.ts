import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../../lib/prisma.js'
import { recomputeAlternativeTotal } from '../../lib/quote.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

function computeTotal(plannedQty: number, unitPrice: number, wastePercent: number) {
  return Math.round(plannedQty * unitPrice * (1 + wastePercent / 100) * 100) / 100
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'POST') {
    const { id, quoteAlternativeId, description, plannedQty, unitPriceSnapshot, wastePercent, unit, section, source } = req.body || {}

    if (typeof quoteAlternativeId !== 'string' || !quoteAlternativeId) {
      return res.status(400).json({ error: 'Chýba quoteAlternativeId.' })
    }
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Popis položky je povinný.' })
    }

    const qty = plannedQty === undefined || plannedQty === '' ? 0 : Number(plannedQty)
    const price = unitPriceSnapshot === undefined || unitPriceSnapshot === '' ? 0 : Number(unitPriceSnapshot)
    const waste = wastePercent === undefined || wastePercent === '' ? 0 : Number(wastePercent)
    if ([qty, price, waste].some((n) => Number.isNaN(n))) {
      return res.status(400).json({ error: 'Množstvo, cena a percento odpadu musia byť čísla.' })
    }

    const count = await prisma.quoteLineItem.count({ where: { quoteAlternativeId } })

    const item = await prisma.quoteLineItem.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        quoteAlternativeId,
        description: description.trim(),
        plannedQty: qty,
        unitPriceSnapshot: price,
        wastePercent: waste,
        unit: typeof unit === 'string' && unit.trim() ? unit.trim() : 'ks',
        total: computeTotal(qty, price, waste),
        section: section === 'nad_ramec' ? 'nad_ramec' : 'main',
        source: source === 'auto_calculated' ? 'auto_calculated' : 'manual',
        sequenceOrder: count,
      },
    })

    await recomputeAlternativeTotal(quoteAlternativeId)

    return res.status(201).json(item)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
