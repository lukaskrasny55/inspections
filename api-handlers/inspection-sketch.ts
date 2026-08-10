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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'POST') {
    const { id, inspectionId, fileUrl } = req.body || {}

    if (typeof inspectionId !== 'string' || !inspectionId) {
      return res.status(400).json({ error: 'Chýba inspectionId.' })
    }
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('data:')) {
      return res.status(400).json({ error: 'Neplatný obsah súboru.' })
    }

    const sketch = await prisma.inspectionSketch.upsert({
      where: { inspectionId },
      create: { id: typeof id === 'string' && id ? id : undefined, inspectionId, fileUrl },
      update: { fileUrl },
    })

    return res.status(200).json(sketch)
  }

  if (req.method === 'DELETE') {
    const inspectionIdParam = req.query.inspectionId
    const inspectionId = typeof inspectionIdParam === 'string' ? inspectionIdParam : undefined
    if (!inspectionId) return res.status(400).json({ error: 'Chýba inspectionId.' })

    try {
      await prisma.inspectionSketch.delete({ where: { inspectionId } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Výkres nebol nájdený.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
