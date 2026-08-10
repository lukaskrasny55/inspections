import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../lib/prisma.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

const SINGLETON_ID = 'singleton'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'GET') {
    const settings = await prisma.companySettings.findUnique({ where: { id: SINGLETON_ID } })
    return res.status(200).json(settings)
  }

  if (req.method === 'PATCH') {
    const { ico, dic, iban, bic, address, email, phone, logoUrl } = req.body || {}
    const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

    const data = {
      ...(ico !== undefined ? { ico: clean(ico) } : {}),
      ...(dic !== undefined ? { dic: clean(dic) } : {}),
      ...(iban !== undefined ? { iban: clean(iban) } : {}),
      ...(bic !== undefined ? { bic: clean(bic) } : {}),
      ...(address !== undefined ? { address: clean(address) } : {}),
      ...(email !== undefined ? { email: clean(email) } : {}),
      ...(phone !== undefined ? { phone: clean(phone) } : {}),
      ...(logoUrl !== undefined ? { logoUrl: typeof logoUrl === 'string' && logoUrl.startsWith('data:') ? logoUrl : null } : {}),
    }

    const settings = await prisma.companySettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    })

    return res.status(200).json(settings)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
