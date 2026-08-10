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

const VALID_STATUSES = ['draft', 'ready_for_quote', 'sent', 'archived']

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined

  if (!id) {
    return res.status(400).json({ error: 'Chýba id obhliadky.' })
  }

  if (req.method === 'PATCH') {
    const body = req.body || {}
    const data: Record<string, unknown> = {}

    if (body.areaM2 !== undefined) {
      const areaM2 = body.areaM2 === null || body.areaM2 === '' ? null : Number(body.areaM2)
      if (areaM2 !== null && Number.isNaN(areaM2)) {
        return res.status(400).json({ error: 'Výmera musí byť číslo.' })
      }
      data.areaM2 = areaM2
    }

    if (body.isInsulated !== undefined) {
      data.isInsulated = body.isInsulated === null ? null : Boolean(body.isInsulated)
    }

    if (body.currentStateDescription !== undefined) {
      const value = body.currentStateDescription
      data.currentStateDescription = typeof value === 'string' && value.trim() ? value.trim() : null
    }

    if (body.inspectionDate !== undefined) {
      data.inspectionDate = body.inspectionDate ? new Date(body.inspectionDate) : null
    }

    if (body.inspectionTime !== undefined) {
      data.inspectionTime = body.inspectionTime ? String(body.inspectionTime).trim() : null
    }

    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: 'Neplatný status.' })
      }
      data.status = body.status
    }

    if (body.technicianId !== undefined) {
      data.technicianId = body.technicianId === null || body.technicianId === '' ? null : body.technicianId
    }

    try {
      const inspection = await prisma.inspection.update({ where: { id }, data })
      return res.status(200).json(inspection)
    } catch {
      return res.status(404).json({ error: 'Obhliadka nebola nájdená.' })
    }
  }

  if (req.method === 'GET') {
    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        customer: true,
        technician: true,
        photos: true,
        sketch: true,
        roofEdges: { orderBy: { sequenceOrder: 'asc' } },
        roofAreaSections: true,
        technicalSolutionItems: { include: { catalogItem: true } },
        drainDownspouts: true,
        gutterSystemItems: true,
        additionalServices: true,
        quoteAlternatives: { include: { lineItems: true, materialComposition: true } },
      },
    })

    if (!inspection) {
      return res.status(404).json({ error: 'Obhliadka nebola nájdená.' })
    }

    return res.status(200).json(inspection)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
