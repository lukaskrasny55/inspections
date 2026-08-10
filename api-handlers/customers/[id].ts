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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined

  if (!id) {
    return res.status(400).json({ error: 'Chýba id zákazníka.' })
  }

  if (req.method === 'PATCH') {
    const body = req.body || {}
    const email = cleanString(body.email)
    if (typeof email === 'string' && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Email nemá platný formát.' })
    }

    const name = cleanString(body.name)
    if (body.name !== undefined && !name) {
      return res.status(400).json({ error: 'Meno je povinné.' })
    }

    try {
      const customer = await prisma.customer.update({
        where: { id },
        data: {
          // `name` is guaranteed non-null here (the guard above already
          // rejected `body.name !== undefined && !name`) — checking
          // truthiness instead of `!== undefined` lets TS narrow out `null`.
          ...(name ? { name } : {}),
          ...(body.address !== undefined ? { address: cleanString(body.address) } : {}),
          ...(body.siteAddress !== undefined ? { siteAddress: cleanString(body.siteAddress) } : {}),
          ...(body.phone !== undefined ? { phone: cleanString(body.phone) } : {}),
          ...(body.email !== undefined ? { email: cleanString(body.email) } : {}),
          ...(body.buildingAdmin !== undefined ? { buildingAdmin: cleanString(body.buildingAdmin) } : {}),
        },
      })
      return res.status(200).json(customer)
    } catch {
      return res.status(404).json({ error: 'Zákazník nebol nájdený.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
