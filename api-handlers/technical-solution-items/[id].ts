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
  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined
  if (!id) return res.status(400).json({ error: 'Chýba id.' })

  if (req.method === 'PATCH') {
    const { isChecked, valueNumber, notes } = req.body || {}
    const data: Record<string, unknown> = {}
    if (isChecked !== undefined) data.isChecked = Boolean(isChecked)
    if (valueNumber !== undefined) {
      if (valueNumber === null || valueNumber === '') {
        data.valueNumber = null
      } else {
        const parsed = Number(valueNumber)
        if (Number.isNaN(parsed)) return res.status(400).json({ error: 'Hodnota musí byť číslo.' })
        data.valueNumber = parsed
      }
    }
    if (notes !== undefined) data.notes = typeof notes === 'string' && notes.trim() ? notes.trim() : null

    try {
      const item = await prisma.technicalSolutionItem.update({ where: { id }, data, include: { catalogItem: true } })
      return res.status(200).json(item)
    } catch {
      return res.status(404).json({ error: 'Záznam nebol nájdený.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.technicalSolutionItem.delete({ where: { id } })
      return res.status(204).end()
    } catch {
      return res.status(404).json({ error: 'Záznam nebol nájdený.' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
