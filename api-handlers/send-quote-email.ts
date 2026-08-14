import type { IncomingMessage, ServerResponse } from 'http'
import { Resend } from 'resend'
import { buildQuoteDocument } from '../lib/quote-document.js'
import { buildTechnicalDocument } from '../lib/technical-document.js'
import { convertDocxToPdf } from '../lib/pdf-convert.js'
import { prisma } from '../lib/prisma.js'

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

  const { id, includeTechnical } = req.body || {}
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

  let attachments: { filename: string; content: string }[]
  try {
    const quotePdf = await convertDocxToPdf(result.buffer, result.filename)
    attachments = [{ filename: result.filename.replace(/\.docx$/i, '.pdf'), content: quotePdf.toString('base64') }]

    if (includeTechnical) {
      const technical = await buildTechnicalDocument(id)
      if (technical) {
        const technicalPdf = await convertDocxToPdf(technical.buffer, technical.filename)
        attachments.push({ filename: technical.filename.replace(/\.docx$/i, '.pdf'), content: technicalPdf.toString('base64') })
      }
    }
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const customerHtml = `<div style="font-family: Arial, Helvetica, sans-serif; color:#1e293b; max-width:560px; margin:0 auto;">
        <h2 style="color:#111827;margin-bottom:16px;">Dobrý deň, ${escapeHtml(result.customer.name)}</h2>
        <p>V prílohe vám posielame cenovú ponuku (${escapeHtml(result.alternative.label)})${includeTechnical ? ' spolu s návrhom technického riešenia' : ''} k referenčnému číslu <b>${escapeHtml(result.alternative.inspection.referenceNumber)}</b>.</p>
        <p>V prípade otázok nás kontaktujte na info@tmshydra.com.</p>
        <br>
        <p>S pozdravom,<br><b>TMS Hydra</b><br>Hydroizolácie a ploché strechy</p>
      </div>`

  try {
    const sendResult = await resend.emails.send({
      from: 'TMS Hydra <info@tmshydra.com>',
      to: result.customer.email,
      subject: `Cenová ponuka ${result.alternative.label} – TMS Hydra`,
      html: customerHtml,
      attachments,
    })

    if (sendResult.error) {
      return res.status(502).json({ error: 'Odoslanie emailu zlyhalo.' })
    }
  } catch {
    return res.status(502).json({ error: 'Odoslanie emailu zlyhalo.' })
  }

  // Kópia pre firmu - nezávislá od úspechu/neúspechu, aby prípadná chyba nevrátila
  // odpoveď "zlyhalo" zákazníkovi, ktorému sa ponuka už reálne odoslala.
  try {
    const company = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })
    if (company?.notifyEmail) {
      await resend.emails.send({
        from: 'TMS Hydra <info@tmshydra.com>',
        to: company.notifyEmail,
        subject: `[Kópia] Cenová ponuka ${result.alternative.label} – ${result.customer.name}`,
        html: `<div style="font-family: Arial, Helvetica, sans-serif; color:#1e293b; max-width:560px; margin:0 auto;">
          <p>Kópia ponuky odoslanej zákazníkovi <b>${escapeHtml(result.customer.name)}</b> (${escapeHtml(result.customer.email)}), referenčné číslo <b>${escapeHtml(result.alternative.inspection.referenceNumber)}</b>.</p>
        </div>`,
        attachments,
      })
    }
  } catch {
    // Zámerne bez vplyvu na odpoveď - kópia pre firmu je len informatívna.
  }

  return res.status(200).json({ ok: true })
}
