import type { IncomingMessage, ServerResponse } from 'http'
import { buildQuoteDocument } from '../lib/quote-document.js'
import { convertDocxToPdf } from '../lib/pdf-convert.js'

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

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await convertDocxToPdf(result.buffer, result.filename)
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message })
  }

  const filename = result.filename.replace(/\.docx$/i, '.pdf')
  // inline (nie attachment) - v prehliadači/appke sa PDF otvorí priamo na náhľad,
  // bez nutnosti sťahovania alebo Wordu.
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
  res.status(200)
  res.end(pdfBuffer)
}
