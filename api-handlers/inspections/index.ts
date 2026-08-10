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

const VALID_STATUSES = ['draft', 'ready_for_quote', 'sent', 'archived']

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'GET') {
    const statusParam = req.query.status
    const status = typeof statusParam === 'string' && VALID_STATUSES.includes(statusParam)
      ? (statusParam as 'draft' | 'ready_for_quote' | 'sent' | 'archived')
      : undefined
    const qParam = req.query.q
    const q = typeof qParam === 'string' ? qParam.trim() : ''

    const inspections = await prisma.inspection.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q
          ? {
              customer: {
                name: { contains: q, mode: 'insensitive' },
              },
            }
          : {}),
      },
      include: { customer: true },
      orderBy: { updatedAt: 'desc' },
    })

    return res.status(200).json(inspections)
  }

  if (req.method === 'POST') {
    const { id, customerId, customerName, customerPhone, customerEmail, customerAddress } = req.body || {}

    if (typeof customerName !== 'string' || customerName.trim().length === 0) {
      return res.status(400).json({ error: 'Meno zákazníka je povinné.' })
    }

    const customer = await prisma.customer.create({
      data: {
        id: typeof customerId === 'string' && customerId ? customerId : undefined,
        name: customerName.trim(),
        phone: typeof customerPhone === 'string' && customerPhone.trim() ? customerPhone.trim() : null,
        email: typeof customerEmail === 'string' && customerEmail.trim() ? customerEmail.trim() : null,
        address: typeof customerAddress === 'string' && customerAddress.trim() ? customerAddress.trim() : null,
      },
    })

    const year = new Date().getFullYear()
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year + 1, 0, 1)
    const countThisYear = await prisma.inspection.count({
      where: { createdAt: { gte: yearStart, lt: yearEnd } },
    })
    const referenceNumber = `OBH-${String(countThisYear + 1).padStart(3, '0')}/${year}`

    const inspection = await prisma.inspection.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        customerId: customer.id,
        referenceNumber,
        status: 'draft',
      },
      include: { customer: true },
    })

    return res.status(201).json(inspection)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
