import { prisma } from './prisma.js'

// Production DB schema is applied by hand (db push), so a freshly deployed
// build could hit calendar_events before the new inquiry columns exist. These
// statements are idempotent (IF NOT EXISTS) and run at most once per server
// instance, so a deploy can never break Plán even if the migration was missed.
let done: Promise<void> | null = null

export function ensureCalendarSchema(): Promise<void> {
  if (!done) {
    done = (async () => {
      await prisma.$executeRawUnsafe('ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "inquiry_stage" TEXT')
      await prisma.$executeRawUnsafe('ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "web_inquiry_id" TEXT')
    })().catch((err) => {
      done = null
      throw err
    })
  }
  return done
}

export const INQUIRY_STAGES = ['new', 'handled', 'ordered', 'declined', 'completed'] as const
export type InquiryStage = (typeof INQUIRY_STAGES)[number]
