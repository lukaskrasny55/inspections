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
  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined
  if (!id) return res.status(400).json({ error: 'Chýba id.' })

  if (req.method === 'PATCH') {
    const { name, layers, workStepsTemplate, warrantyYears, featuredProductId } = req.body || {}
    const data: Record<string, unknown> = {}

    if (name !== undefined) data.name = String(name).trim()
    if (layers !== undefined) data.layersJson = Array.isArray(layers) ? layers : []
    if (workStepsTemplate !== undefined) {
      data.workStepsTemplate = typeof workStepsTemplate === 'string' && workStepsTemplate.trim() ? workStepsTemplate.trim() : null
    }
    if (warrantyYears !== undefined) {
      data.warrantyYears = warrantyYears === null || warrantyYears === '' ? null : Number(warrantyYears)
    }
    if (featuredProductId !== undefined) {
      data.featuredProductId = featuredProductId || null
    }

    try {
      const item = await prisma.materialComposition.update({ where: { id }, data, include: { featuredProduct: true } })
      return res.status(200).json(item)
    } catch {
      return res.status(404).json({ error: 'Skladba nebola nájdená.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.materialComposition.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Skladba nebola nájdená.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
