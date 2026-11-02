-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "inquiry_stage" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "web_inquiry_id" TEXT;
