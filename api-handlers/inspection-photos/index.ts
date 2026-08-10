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
    const { id, inspectionId, url, caption } = req.body || {}

    if (typeof inspectionId !== 'string' || !inspectionId) {
      return res.status(400).json({ error: 'Chýba inspectionId.' })
    }
    if (typeof url !== 'string' || !url.startsWith('data:')) {
      return res.status(400).json({ error: 'Neplatný obsah fotky.' })
    }

    const photo = await prisma.inspectionPhoto.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        inspectionId,
        url,
        caption: typeof caption === 'string' && caption.trim() ? caption.trim() : null,
      },
    })

    return res.status(201).json(photo)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
