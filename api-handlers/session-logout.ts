import type { IncomingMessage, ServerResponse } from 'http'
import { clearAuthCookieHeader, isSecureRequest } from '../lib/auth.js'

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

export default async function handler(req: IncomingMessage, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Set-Cookie', clearAuthCookieHeader(isSecureRequest(req)))
  return res.status(200).json({ ok: true })
}
