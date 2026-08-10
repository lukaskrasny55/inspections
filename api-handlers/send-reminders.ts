import type { IncomingMessage, ServerResponse } from 'http'
import { Resend } from 'resend'
import { prisma } from '../lib/prisma.js'

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

const BRAND = {
  heading: '#111827',
  accent: '#111827',
  muted: '#6b7280',
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function wrapEmail(innerHtml: string): string {
  return `<div style="font-family: Arial, Helvetica, sans-serif; color:#1e293b; max-width:560px; margin:0 auto;">${innerHtml}</div>`
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
}

function tomorrowRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999)
  return { start, end }
}

function reminderEmail(opts: {
  heading: string
  dateLabel: string
  timeLabel: string | null
  locationLabel: string | null
  extraLines: string[]
}) {
  const { heading, dateLabel, timeLabel, locationLabel, extraLines } = opts
  return wrapEmail(`
    <h2 style="color:${BRAND.heading};margin-bottom:16px;">${escapeHtml(heading)}</h2>
    <p style="font-size:16px"><b style="color:${BRAND.accent}">${escapeHtml(dateLabel)}${
      timeLabel ? ` o ${escapeHtml(timeLabel)}` : ''
    }</b></p>
    ${locationLabel ? `<p><b>Miesto:</b> ${escapeHtml(locationLabel)}</p>` : ''}
    ${extraLines.map((line) => `<p>${line}</p>`).join('')}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:${BRAND.muted};font-size:12px">Automatická pripomienka z aplikácie TMS Hydra Obhliadky</p>
  `)
}

interface SendResult {
  id: string
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
}

// resend.emails.send() resolves with { error } on API failures (e.g. an
// invalid key) rather than throwing — a bare try/catch would silently treat
// that as success and mark the reminder sent even though nothing went out.
async function sendEmail(resend: Resend, payload: Parameters<Resend['emails']['send']>[0]): Promise<boolean> {
  try {
    const result = await resend.emails.send(payload)
    return !result.error
  } catch {
    return false
  }
}

export default async function handler(_req: IncomingMessage, res: ApiResponse) {
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY nie je nastavený.' })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)

  const companySettings = await prisma.companySettings.findFirst()
  const ownerEmail = companySettings?.email || null

  const { start, end } = tomorrowRange()
  const range = { gte: start, lte: end }

  const results: SendResult[] = []

  const inspections = await prisma.inspection.findMany({
    where: { inspectionDate: range, reminderSentAt: null },
    include: { customer: true },
  })

  for (const insp of inspections) {
    if (!insp.inspectionDate) continue
    const dateLabel = formatDate(insp.inspectionDate)
    const location = insp.customer.siteAddress || insp.customer.address
    const errors: string[] = []
    let anySent = false

    if (ownerEmail) {
      const ok = await sendEmail(resend, {
        from: 'TMS Hydra <info@tmshydra.com>',
        to: ownerEmail,
        subject: `Zajtra obhliadka – ${insp.customer.name}`,
        html: reminderEmail({
          heading: `Zajtra máte naplánovanú obhliadku – ${escapeHtml(insp.customer.name)}`,
          dateLabel,
          timeLabel: insp.inspectionTime,
          locationLabel: location,
          extraLines: [`<b>Referenčné číslo:</b> ${escapeHtml(insp.referenceNumber)}`],
        }),
      })
      if (ok) anySent = true
      else errors.push('owner send failed')
    }

    if (insp.customer.email) {
      const ok = await sendEmail(resend, {
        from: 'TMS Hydra <info@tmshydra.com>',
        to: insp.customer.email,
        subject: 'Pripomienka obhliadky – TMS Hydra',
        html: reminderEmail({
          heading: `Pripomíname vám zajtrajšiu obhliadku, ${escapeHtml(insp.customer.name)}`,
          dateLabel,
          timeLabel: insp.inspectionTime,
          locationLabel: location,
          extraLines: ['V prípade potreby zmeny termínu nás kontaktujte na info@tmshydra.com.'],
        }),
      })
      if (ok) anySent = true
      else errors.push('customer send failed')
    }

    if (errors.length > 0) {
      results.push({ id: insp.id, status: 'failed', reason: errors.join(', ') })
    } else if (anySent) {
      await prisma.inspection.update({ where: { id: insp.id }, data: { reminderSentAt: new Date() } })
      results.push({ id: insp.id, status: 'sent' })
    } else {
      results.push({ id: insp.id, status: 'skipped', reason: 'no recipient email configured' })
    }
  }

  const alternatives = await prisma.quoteAlternative.findMany({
    where: {
      reminderSentAt: null,
      OR: [{ realizationStartDate: range }],
    },
    include: { inspection: { include: { customer: true } } },
  })

  for (const alt of alternatives) {
    if (!alt.realizationStartDate) continue
    const dateLabel = formatDate(alt.realizationStartDate)
    const location = alt.inspection.customer.siteAddress || alt.inspection.customer.address
    const errors: string[] = []
    let anySent = false

    if (ownerEmail) {
      const ok = await sendEmail(resend, {
        from: 'TMS Hydra <info@tmshydra.com>',
        to: ownerEmail,
        subject: `Zajtra realizácia – ${alt.inspection.customer.name}`,
        html: reminderEmail({
          heading: `Zajtra začína realizácia – ${escapeHtml(alt.inspection.customer.name)}`,
          dateLabel,
          timeLabel: alt.realizationStartTime,
          locationLabel: location,
          extraLines: [`<b>Referenčné číslo:</b> ${escapeHtml(alt.inspection.referenceNumber)}`],
        }),
      })
      if (ok) anySent = true
      else errors.push('owner send failed')
    }

    if (alt.inspection.customer.email) {
      const ok = await sendEmail(resend, {
        from: 'TMS Hydra <info@tmshydra.com>',
        to: alt.inspection.customer.email,
        subject: 'Pripomienka realizácie – TMS Hydra',
        html: reminderEmail({
          heading: `Pripomíname, že zajtra začíname realizáciu, ${escapeHtml(alt.inspection.customer.name)}`,
          dateLabel,
          timeLabel: alt.realizationStartTime,
          locationLabel: location,
          extraLines: ['V prípade potreby zmeny termínu nás kontaktujte na info@tmshydra.com.'],
        }),
      })
      if (ok) anySent = true
      else errors.push('customer send failed')
    }

    if (errors.length > 0) {
      results.push({ id: alt.id, status: 'failed', reason: errors.join(', ') })
    } else if (anySent) {
      await prisma.quoteAlternative.update({ where: { id: alt.id }, data: { reminderSentAt: new Date() } })
      results.push({ id: alt.id, status: 'sent' })
    } else {
      results.push({ id: alt.id, status: 'skipped', reason: 'no recipient email configured' })
    }
  }

  const calendarEvents = await prisma.calendarEvent.findMany({
    where: { date: range, reminderSentAt: null },
  })

  for (const ev of calendarEvents) {
    if (!ownerEmail) {
      results.push({ id: ev.id, status: 'skipped', reason: 'no owner email configured' })
      continue
    }
    const ok = await sendEmail(resend, {
      from: 'TMS Hydra <info@tmshydra.com>',
      to: ownerEmail,
      subject: `Zajtra – ${ev.title}`,
      html: reminderEmail({
        heading: `Zajtra máte naplánované: ${escapeHtml(ev.title)}`,
        dateLabel: formatDate(ev.date),
        timeLabel: ev.startTime,
        locationLabel: ev.location,
        extraLines: ev.notes ? [escapeHtml(ev.notes)] : [],
      }),
    })
    if (ok) {
      await prisma.calendarEvent.update({ where: { id: ev.id }, data: { reminderSentAt: new Date() } })
      results.push({ id: ev.id, status: 'sent' })
    } else {
      results.push({ id: ev.id, status: 'failed', reason: 'owner send failed' })
    }
  }

  // Warranty expiry: unlike the day-before reminders above (fixed "tomorrow"
  // window), this checks a rolling 30-day-out window against a *computed*
  // date (realizationEndDate + warrantyYears) that Postgres can't filter on
  // directly, so candidates are narrowed in SQL and the exact date math is
  // done in JS — fine at this app's data volume.
  const warrantyCandidates = await prisma.quoteAlternative.findMany({
    where: {
      warrantyReminderSentAt: null,
      warrantyYears: { not: null },
      realizationEndDate: { not: null },
    },
    include: { inspection: { include: { customer: true } } },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysOut = new Date(today)
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

  for (const alt of warrantyCandidates) {
    if (!alt.realizationEndDate || alt.warrantyYears === null) continue
    const expiryDate = new Date(alt.realizationEndDate)
    expiryDate.setFullYear(expiryDate.getFullYear() + alt.warrantyYears)
    if (expiryDate < today || expiryDate > thirtyDaysOut) continue

    if (!ownerEmail) {
      results.push({ id: alt.id, status: 'skipped', reason: 'no owner email configured' })
      continue
    }

    const ok = await sendEmail(resend, {
      from: 'TMS Hydra <info@tmshydra.com>',
      to: ownerEmail,
      subject: `Blíži sa koniec záruky – ${alt.inspection.customer.name}`,
      html: reminderEmail({
        heading: `Záruka čoskoro končí – ${escapeHtml(alt.inspection.customer.name)}`,
        dateLabel: formatDate(expiryDate),
        timeLabel: null,
        locationLabel: alt.inspection.customer.siteAddress || alt.inspection.customer.address,
        extraLines: [
          `<b>Referenčné číslo:</b> ${escapeHtml(alt.inspection.referenceNumber)}`,
          `<b>Záruka:</b> ${alt.warrantyYears} ${alt.warrantyYears === 1 ? 'rok' : alt.warrantyYears < 5 ? 'roky' : 'rokov'} od realizácie`,
        ],
      }),
    })
    if (ok) {
      await prisma.quoteAlternative.update({ where: { id: alt.id }, data: { warrantyReminderSentAt: new Date() } })
      results.push({ id: alt.id, status: 'sent' })
    } else {
      results.push({ id: alt.id, status: 'failed', reason: 'owner send failed' })
    }
  }

  return res.status(200).json({
    range: { from: start.toISOString(), to: end.toISOString() },
    sent: results.filter((r) => r.status === 'sent').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  })
}
