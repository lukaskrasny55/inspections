import type { IncomingMessage, ServerResponse } from 'http'
import { authCookieHeader, checkPassword, expectedCookieValue, isSecureRequest } from '../lib/auth.js'

interface ApiRequest extends IncomingMessage {
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

const THIRTY_DAYS = 30 * 24 * 60 * 60

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body || {}
  if (typeof password !== 'string' || !(await checkPassword(password))) {
    return res.status(401).json({ error: 'Nesprávne heslo.' })
  }

  const value = await expectedCookieValue()
  if (value !== null) {
    res.setHeader('Set-Cookie', authCookieHeader(value, THIRTY_DAYS, isSecureRequest(req)))
  }
  return res.status(200).json({ ok: true })
}
