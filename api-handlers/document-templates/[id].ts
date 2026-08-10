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
    const { key, title, content } = req.body || {}
    const data: Record<string, unknown> = {}
    if (key !== undefined) data.key = String(key).trim()
    if (title !== undefined) data.title = String(title).trim()
    if (content !== undefined) data.content = String(content)

    try {
      const item = await prisma.documentTemplate.update({ where: { id }, data })
      return res.status(200).json(item)
    } catch {
      return res.status(404).json({ error: 'Šablóna nebola nájdená.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.documentTemplate.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Šablóna nebola nájdená.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
