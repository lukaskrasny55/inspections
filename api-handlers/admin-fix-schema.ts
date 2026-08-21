import type { IncomingMessage, ServerResponse } from 'http'
import { prisma } from '../lib/prisma.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

// TEMPORARY one-off utility to bring the *actual* production database (the
// one this deployed function connects to via process.env.DATABASE_URL, which
// is marked Sensitive in Vercel and can't be pulled/viewed via CLI or
// dashboard) in sync with schema.prisma, since `prisma db push` run locally
// was hitting a different database. Delete this file + its registration in
// api/handler.ts (and the bypass in middleware.ts) as soon as it's confirmed
// working — it is not meant to stay in the codebase.
const ONE_TIME_TOKEN = 'tms-hydra-fix-8f3a1c9d2e'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const token = req.query.token
  if (token !== ONE_TIME_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const steps: { label: string; sql: string }[] = [
    {
      label: 'add_column',
      sql: `ALTER TABLE "quote_line_items" ADD COLUMN IF NOT EXISTS "technical_solution_item_id" TEXT`,
    },
    {
      label: 'add_enum_value',
      sql: `ALTER TYPE "LineItemSource" ADD VALUE IF NOT EXISTS 'from_checklist'`,
    },
    {
      label: 'add_fk',
      sql: `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_line_items_technical_solution_item_id_fkey'
  ) THEN
    ALTER TABLE "quote_line_items"
      ADD CONSTRAINT "quote_line_items_technical_solution_item_id_fkey"
      FOREIGN KEY ("technical_solution_item_id") REFERENCES "technical_solution_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;`,
    },
  ]

  const results: Record<string, string> = {}
  for (const step of steps) {
    try {
      await prisma.$executeRawUnsafe(step.sql)
      results[step.label] = 'ok'
    } catch (err) {
      results[step.label] = (err as Error).message
    }
  }

  // Confirms the column is now genuinely queryable from this same connection,
  // not just that the ALTER statements ran without error.
  let verify = 'unknown'
  try {
    await prisma.$queryRawUnsafe('SELECT technical_solution_item_id FROM quote_line_items LIMIT 1')
    verify = 'column_readable'
  } catch (err) {
    verify = `verify_failed: ${(err as Error).message}`
  }

  return res.status(200).json({ ok: true, results, verify })
}
