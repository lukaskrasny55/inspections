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
    const items = await prisma.materialProduct.findMany({ orderBy: { name: 'asc' } })
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    const { id, name, description } = req.body || {}

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Názov je povinný.' })
    }
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Popis je povinný.' })
    }

    const item = await prisma.materialProduct.create({
      data: { id: typeof id === 'string' && id ? id : undefined, name: name.trim(), description: description.trim() },
    })

    return res.status(201).json(item)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
