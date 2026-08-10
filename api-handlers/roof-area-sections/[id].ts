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
    const existing = await prisma.roofAreaSection.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Záznam nebol nájdený.' })

    const { label, widthM, heightM } = req.body || {}
    const data: Record<string, unknown> = {}
    if (label !== undefined) data.label = String(label).trim()

    const nextWidth = widthM !== undefined ? Number(widthM) : Number(existing.widthM)
    const nextHeight = heightM !== undefined ? Number(heightM) : Number(existing.heightM)
    if (widthM !== undefined || heightM !== undefined) {
      if (Number.isNaN(nextWidth) || Number.isNaN(nextHeight)) {
        return res.status(400).json({ error: 'Šírka a výška musia byť čísla.' })
      }
      data.widthM = nextWidth
      data.heightM = nextHeight
      data.areaM2 = Math.round(nextWidth * nextHeight * 100) / 100
    }

    const section = await prisma.roofAreaSection.update({ where: { id }, data })
    return res.status(200).json(section)
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.roofAreaSection.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Záznam nebol nájdený.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
