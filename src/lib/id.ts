// Client-generated record ids so offline-created records (and anything they
// reference, e.g. a photo pointing at an inspection created while offline)
// have a stable id before they ever reach the server. Every Prisma model's
// `id` column is a plain `String @id @default(cuid())`, so any unique string
// — including a UUID — is accepted; the default only kicks in when omitted.
export function newId(): string {
  return crypto.randomUUID()
}
