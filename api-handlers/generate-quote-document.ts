import type { IncomingMessage, ServerResponse } from 'http'
import { buildQuoteDocument } from '../lib/quote-document.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined
  if (!id) {
    return res.status(400).json({ error: 'Chýba id cenovej alternatívy.' })
  }

  const result = await buildQuoteDocument(id)
  if (!result) {
    return res.status(404).json({ error: 'Cenová alternatíva nebola nájdená.' })
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
  res.status(200)
  res.end(result.buffer)
}
