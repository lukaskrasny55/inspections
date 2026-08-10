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
    const { id, inspectionId, catalogItemId, isChecked, valueNumber, notes } = req.body || {}

    if (typeof inspectionId !== 'string' || !inspectionId) {
      return res.status(400).json({ error: 'Chýba inspectionId.' })
    }
    if (typeof catalogItemId !== 'string' || !catalogItemId) {
      return res.status(400).json({ error: 'Chýba catalogItemId.' })
    }
    let parsedValue: number | null = null
    if (valueNumber !== undefined && valueNumber !== null && valueNumber !== '') {
      parsedValue = Number(valueNumber)
      if (Number.isNaN(parsedValue)) return res.status(400).json({ error: 'Hodnota musí byť číslo.' })
    }

    try {
      const item = await prisma.technicalSolutionItem.create({
        data: {
          id: typeof id === 'string' && id ? id : undefined,
          inspectionId,
          catalogItemId,
          isChecked: Boolean(isChecked),
          valueNumber: parsedValue,
          notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
        },
        include: { catalogItem: true },
      })
      return res.status(201).json(item)
    } catch {
      return res.status(409).json({ error: 'Táto položka checklistu už existuje.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
