import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../lib/prisma.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const from = param(req.query.from)
  const to = param(req.query.to)
  if (!from || !to) {
    return res.status(400).json({ error: 'Chýba parameter from alebo to.' })
  }

  const range = { gte: new Date(from), lte: new Date(`${to}T23:59:59`) }

  const alternatives = await prisma.quoteAlternative.findMany({
    where: { realizationEndDate: range },
    include: {
      inspection: { include: { customer: true } },
      lineItems: true,
    },
    orderBy: { realizationEndDate: 'asc' },
  })

  const items = alternatives.map((alt) => {
    const subtotal = alt.lineItems.reduce((sum, li) => sum + Number(li.total), 0)
    const discount = Number(alt.discountPercent)
    const revenue = Math.round((subtotal - subtotal * (discount / 100)) * 100) / 100
    return {
      id: alt.id,
      label: alt.label,
      customerName: alt.inspection.customer.name,
      referenceNumber: alt.inspection.referenceNumber,
      realizationEndDate: alt.realizationEndDate ? alt.realizationEndDate.toISOString() : null,
      areaM2: alt.inspection.areaM2 !== null ? Number(alt.inspection.areaM2) : null,
      revenue,
    }
  })

  const totalAreaM2 = Math.round(items.reduce((sum, i) => sum + (i.areaM2 ?? 0), 0) * 100) / 100
  const totalRevenue = Math.round(items.reduce((sum, i) => sum + i.revenue, 0) * 100) / 100

  return res.status(200).json({
    count: items.length,
    totalAreaM2,
    totalRevenue,
    items,
  })
}
