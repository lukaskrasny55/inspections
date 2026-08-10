import type { IncomingMessage, ServerResponse } from 'http'
import { isAuthEnabled, isAuthorized } from '../lib/auth.js'

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

export default async function handler(req: IncomingMessage, res: ApiResponse) {
  const authEnabled = isAuthEnabled()
  const authorized = authEnabled ? await isAuthorized(req) : true
  return res.status(200).json({ authEnabled, authorized })
}
