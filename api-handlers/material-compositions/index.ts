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
    const items = await prisma.materialComposition.findMany({ orderBy: { name: 'asc' }, include: { featuredProduct: true } })
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    const { id, name, layers, workStepsTemplate, warrantyYears } = req.body || {}

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Názov je povinný.' })
    }

    const item = await prisma.materialComposition.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        name: name.trim(),
        layersJson: Array.isArray(layers) ? layers : [],
        workStepsTemplate: typeof workStepsTemplate === 'string' && workStepsTemplate.trim() ? workStepsTemplate.trim() : null,
        warrantyYears: warrantyYears === undefined || warrantyYears === null || warrantyYears === '' ? null : Number(warrantyYears),
      },
    })

    return res.status(201).json(item)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
