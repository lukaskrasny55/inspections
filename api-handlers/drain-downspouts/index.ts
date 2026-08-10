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
    const { id, inspectionId, label, lengthM } = req.body || {}

    if (typeof inspectionId !== 'string' || !inspectionId) {
      return res.status(400).json({ error: 'Chýba inspectionId.' })
    }
    const length = Number(lengthM)
    if (Number.isNaN(length)) {
      return res.status(400).json({ error: 'Dĺžka musí byť číslo.' })
    }

    const count = await prisma.drainDownspout.count({ where: { inspectionId } })

    const item = await prisma.drainDownspout.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        inspectionId,
        label: typeof label === 'string' && label.trim() ? label.trim() : `Zvod ${count + 1}`,
        lengthM: length,
      },
    })

    return res.status(201).json(item)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
