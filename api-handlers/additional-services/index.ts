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
  if (req.method === 'POST') {
    const { id, inspectionId, description, photoUrl } = req.body || {}

    if (typeof inspectionId !== 'string' || !inspectionId) {
      return res.status(400).json({ error: 'Chýba inspectionId.' })
    }
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Popis je povinný.' })
    }

    const service = await prisma.additionalService.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        inspectionId,
        description: description.trim(),
        photoUrl: typeof photoUrl === 'string' && photoUrl.startsWith('data:') ? photoUrl : null,
      },
    })

    return res.status(201).json(service)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
