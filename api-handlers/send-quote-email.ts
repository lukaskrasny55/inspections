import type { IncomingMessage, ServerResponse } from 'http'
import { Resend } from 'resend'
import { buildQuoteDocument } from '../lib/quote-document.js'

interface ApiRequest extends IncomingMessage {
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY nie je nastavený.' })
  }

  const { id } = req.body || {}
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Chýba id cenovej alternatívy.' })
  }

  const result = await buildQuoteDocument(id)
  if (!result) {
    return res.status(404).json({ error: 'Cenová alternatíva nebola nájdená.' })
  }

  if (!result.customer.email) {
    return res.status(400).json({ error: 'Zákazník nemá vyplnený email.' })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const sendResult = await resend.emails.send({
      from: 'TMS Hydra <info@tmshydra.com>',
      to: result.customer.email,
      subject: `Cenová ponuka ${result.alternative.label} – TMS Hydra`,
      html: `<div style="font-family: Arial, Helvetica, sans-serif; color:#1e293b; max-width:560px; margin:0 auto;">
        <h2 style="color:#111827;margin-bottom:16px;">Dobrý deň, ${escapeHtml(result.customer.name)}</h2>
        <p>V prílohe vám posielame cenovú ponuku (${escapeHtml(result.alternative.label)}) k referenčnému číslu <b>${escapeHtml(result.alternative.inspection.referenceNumber)}</b>.</p>
        <p>V prípade otázok nás kontaktujte na info@tmshydra.com.</p>
        <br>
        <p>S pozdravom,<br><b>TMS Hydra</b><br>Hydroizolácie a ploché strechy</p>
      </div>`,
      attachments: [
        {
          filename: result.filename,
          content: result.buffer.toString('base64'),
        },
      ],
    })

    if (sendResult.error) {
      return res.status(502).json({ error: 'Odoslanie emailu zlyhalo.' })
    }

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(502).json({ error: 'Odoslanie emailu zlyhalo.' })
  }
}
