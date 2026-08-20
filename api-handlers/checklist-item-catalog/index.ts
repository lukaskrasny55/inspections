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

const VALID_CATEGORIES = ['material', 'prace', 'ine']

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'GET') {
    const activeOnly = req.query.active === 'true'
    const items = await prisma.checklistItemCatalog.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    })
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    const { id, name, unit, defaultUnitPrice, category, source } = req.body || {}

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Názov položky je povinný.' })
    }
    const price = Number(defaultUnitPrice)
    if (Number.isNaN(price)) {
      return res.status(400).json({ error: 'Cena musí byť číslo.' })
    }
    if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Neplatná kategória.' })
    }

    // Katalóg je spoločný a trvalý naprieč všetkými zákazkami — bez tejto
    // kontroly by si každá obhliadka mohla vytvoriť vlastnú "Oprava komína",
    // "oprava komína", "Oprava komina" atď. Porovnávame orezaný názov bez
    // ohľadu na veľkosť písmen; ak zhoda existuje, vrátime existujúcu
    // položku namiesto vytvorenia duplicity.
    const trimmedName = name.trim()
    const existing = await prisma.checklistItemCatalog.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    })
    if (existing) {
      return res.status(200).json({ ...existing, reused: true })
    }

    const item = await prisma.checklistItemCatalog.create({
      data: {
        id: typeof id === 'string' && id ? id : undefined,
        name: trimmedName,
        unit: typeof unit === 'string' && unit.trim() ? unit.trim() : 'ks',
        defaultUnitPrice: price,
        category: category as 'material' | 'prace' | 'ine',
        source: source === 'system_default' ? 'system_default' : 'custom_added',
      },
    })

    return res.status(201).json(item)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
