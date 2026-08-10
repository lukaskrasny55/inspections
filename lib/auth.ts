import type { IncomingMessage } from 'http'

const COOKIE_NAME = 'tms_auth'

function getPassword(): string | undefined {
  const value = process.env.APP_PASSWORD
  return value && value.trim() ? value.trim() : undefined
}

export function isAuthEnabled(): boolean {
  return getPassword() !== undefined
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Deterministic from the password alone (no server-side session store needed —
// works across stateless serverless invocations). Anyone who submits the
// correct password gets the same cookie value; the value itself never reveals
// the password since SHA-256 isn't reversible.
export async function expectedCookieValue(): Promise<string | null> {
  const password = getPassword()
  if (!password) return null
  return sha256Hex(password)
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const password = getPassword()
  if (!password) return true
  return candidate === password
}

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  if (!header) return result
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (key) result[key] = decodeURIComponent(value)
  }
  return result
}

export async function isAuthorized(req: IncomingMessage): Promise<boolean> {
  const expected = await expectedCookieValue()
  if (expected === null) return true
  const cookies = parseCookies(req.headers.cookie)
  return cookies[COOKIE_NAME] === expected
}

export function authCookieHeader(value: string, maxAgeSeconds: number, secure: boolean): string {
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearAuthCookieHeader(secure: boolean): string {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function isSecureRequest(req: IncomingMessage): boolean {
  return req.headers['x-forwarded-proto'] === 'https'
}
