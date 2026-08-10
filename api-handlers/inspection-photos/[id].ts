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
    const { caption, url } = req.body || {}
    const data: Record<string, unknown> = {}
    if (caption !== undefined) data.caption = typeof caption === 'string' && caption.trim() ? caption.trim() : null
    if (url !== undefined) {
      if (typeof url !== 'string' || !url.startsWith('data:')) {
        return res.status(400).json({ error: 'Neplatný obsah fotky.' })
      }
      data.url = url
    }

    try {
      const photo = await prisma.inspectionPhoto.update({ where: { id }, data })
      return res.status(200).json(photo)
    } catch {
      return res.status(404).json({ error: 'Fotka nebola nájdená.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.inspectionPhoto.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Fotka nebola nájdená.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
