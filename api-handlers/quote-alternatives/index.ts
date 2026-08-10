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
    const { id, inspectionId, label } = req.body || {}

    if (typeof inspectionId !== 'string' || !inspectionId) {
      return res.status(400).json({ error: 'Chýba inspectionId.' })
    }
    if (typeof label !== 'string' || !label.trim()) {
      return res.status(400).json({ error: 'Označenie alternatívy je povinné.' })
    }

    try {
      const alternative = await prisma.quoteAlternative.create({
        data: {
          id: typeof id === 'string' && id ? id : undefined,
          inspectionId,
          label: label.trim(),
          totalPrice: 0,
        },
        include: { lineItems: true },
      })
      return res.status(201).json(alternative)
    } catch {
      return res.status(409).json({ error: 'Alternatíva s týmto označením už existuje.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
