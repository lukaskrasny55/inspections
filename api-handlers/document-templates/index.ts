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
  if (req.method === 'GET') {
    const items = await prisma.documentTemplate.findMany({ orderBy: { key: 'asc' } })
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    const { id, key, title, content } = req.body || {}

    if (typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'Kľúč je povinný.' })
    }
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Názov je povinný.' })
    }

    try {
      const item = await prisma.documentTemplate.create({
        data: {
          id: typeof id === 'string' && id ? id : undefined,
          key: key.trim(),
          title: title.trim(),
          content: typeof content === 'string' ? content : '',
        },
      })
      return res.status(201).json(item)
    } catch {
      return res.status(409).json({ error: 'Šablóna s týmto kľúčom už existuje.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
