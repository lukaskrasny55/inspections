import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../../lib/prisma.js'

interface ApiRequest extends IncomingMessage {
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sourceId, id, customerId } = req.body || {}
  if (typeof sourceId !== 'string' || !sourceId) {
    return res.status(400).json({ error: 'Chýba sourceId.' })
  }

  const source = await prisma.inspection.findUnique({
    where: { id: sourceId },
    include: {
      customer: true,
      roofEdges: true,
      roofAreaSections: true,
      gutterSystemItems: true,
      drainDownspouts: true,
      technicalSolutionItems: true,
    },
  })

  if (!source) {
    return res.status(404).json({ error: 'Obhliadka nebola nájdená.' })
  }

  const newCustomer = await prisma.customer.create({
    data: {
      id: typeof customerId === 'string' && customerId ? customerId : undefined,
      name: source.customer.name,
      address: source.customer.address,
      siteAddress: source.customer.siteAddress,
      phone: source.customer.phone,
      email: source.customer.email,
      buildingAdmin: source.customer.buildingAdmin,
    },
  })

  const year = new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const countThisYear = await prisma.inspection.count({
    where: { createdAt: { gte: yearStart, lt: yearEnd } },
  })
  const referenceNumber = `OBH-${String(countThisYear + 1).padStart(3, '0')}/${year}`

  const newInspection = await prisma.inspection.create({
    data: {
      id: typeof id === 'string' && id ? id : undefined,
      customerId: newCustomer.id,
      referenceNumber,
      status: 'draft',
      areaM2: source.areaM2,
      isInsulated: source.isInsulated,
      currentStateDescription: source.currentStateDescription,
      technicianId: source.technicianId,
      roofEdges: {
        create: source.roofEdges.map((e) => ({
          label: e.label,
          lengthM: e.lengthM,
          atikaHeightCm: e.atikaHeightCm,
          sequenceOrder: e.sequenceOrder,
        })),
      },
      roofAreaSections: {
        create: source.roofAreaSections.map((s) => ({
          label: s.label,
          widthM: s.widthM,
          heightM: s.heightM,
          areaM2: s.areaM2,
        })),
      },
      gutterSystemItems: {
        create: source.gutterSystemItems.map((g) => ({
          itemType: g.itemType,
          quantity: g.quantity,
          unit: g.unit,
        })),
      },
      drainDownspouts: {
        create: source.drainDownspouts.map((d) => ({
          label: d.label,
          lengthM: d.lengthM,
        })),
      },
      technicalSolutionItems: {
        create: source.technicalSolutionItems.map((t) => ({
          catalogItemId: t.catalogItemId,
          isChecked: t.isChecked,
          valueNumber: t.valueNumber,
          notes: t.notes,
        })),
      },
    },
    include: { customer: true },
  })

  return res.status(201).json(newInspection)
}
