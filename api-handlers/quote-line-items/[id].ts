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
  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined
  if (!id) return res.status(400).json({ error: 'Chýba id.' })

  if (req.method === 'PATCH') {
    const existing = await prisma.quoteLineItem.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Záznam nebol nájdený.' })

    const body = req.body || {}
    const data: Record<string, unknown> = {}

    if (body.description !== undefined) data.description = String(body.description).trim()
    if (body.section !== undefined) data.section = body.section === 'nad_ramec' ? 'nad_ramec' : 'main'
    if (body.unit !== undefined) data.unit = String(body.unit).trim() || 'ks'

    const hasRecalcInput = body.plannedQty !== undefined || body.unitPriceSnapshot !== undefined || body.wastePercent !== undefined
    const nextQty = body.plannedQty !== undefined ? Number(body.plannedQty) : Number(existing.plannedQty ?? 0)
    const nextPrice = body.unitPriceSnapshot !== undefined ? Number(body.unitPriceSnapshot) : Number(existing.unitPriceSnapshot)
    const nextWaste = body.wastePercent !== undefined ? Number(body.wastePercent) : Number(existing.wastePercent ?? 0)

    if (hasRecalcInput) {
      if ([nextQty, nextPrice, nextWaste].some((n) => Number.isNaN(n))) {
        return res.status(400).json({ error: 'Množstvo, cena a percento odpadu musia byť čísla.' })
      }
      if (body.plannedQty !== undefined) data.plannedQty = nextQty
      if (body.unitPriceSnapshot !== undefined) data.unitPriceSnapshot = nextPrice
      if (body.wastePercent !== undefined) data.wastePercent = nextWaste
      data.total = computeTotal(nextQty, nextPrice, nextWaste)
      data.source = 'manual'
    } else if (body.total !== undefined) {
      const total = Number(body.total)
      if (Number.isNaN(total)) return res.status(400).json({ error: 'Cena musí byť číslo.' })
      data.total = total
      data.source = 'manual'
    }

    const item = await prisma.quoteLineItem.update({ where: { id }, data })
    await recomputeAlternativeTotal(item.quoteAlternativeId)

    return res.status(200).json(item)
  }

  if (req.method === 'DELETE') {
    const existing = await prisma.quoteLineItem.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Záznam nebol nájdený.' })

    await prisma.quoteLineItem.delete({ where: { id } })
    await recomputeAlternativeTotal(existing.quoteAlternativeId)

    return res.status(204).end()
  }

  res.status(405).json({ error: 'Method not allowed' })
}
