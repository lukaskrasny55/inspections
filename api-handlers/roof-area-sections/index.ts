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
    const { id, inspectionId, label, widthM, heightM } = req.body || {}

    if (typeof inspectionId !== 'string' || !inspectionId) {
      return res.status(400).json({ error: 'Chýba inspectionId.' })
    }
    const width = Number(widthM)
    const height = Number(heightM)
    if (Number.isNaN(width) || Number.isNaN(height)) {
      return res.status(400).json({ error: 'Šírka a výška musia byť čísla.' })
    }

    const count = await prisma.roofAreaSection.count({ where: { inspectionId } })

    const section = await prisma.roofAreaSection.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        inspectionId,
        label: typeof label === 'string' && label.trim() ? label.trim() : `Časť ${count + 1}`,
        widthM: width,
        heightM: height,
        areaM2: Math.round(width * height * 100) / 100,
      },
    })

    return res.status(201).json(section)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
