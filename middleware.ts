import { isAuthEnabled, isAuthorized } from './lib/auth.js'

// Vercel Edge Middleware — runs before every request to /api/* once this app
// is actually deployed (the local `npm run dev` flow uses the separate check
// wired into vite.config.ts's dev middleware instead, since Edge Middleware
// itself only executes on Vercel's platform, not under `vite dev`).
export const config = {
  matcher: '/api/:path*',
}

export default async function middleware(request: Request) {
  if (!isAuthEnabled()) return

  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/session-')) return

  // Vercel Cron triggers this endpoint directly with no session cookie —
  // Vercel automatically attaches `Authorization: Bearer $CRON_SECRET` to
  // cron-triggered requests when that env var is set, so verifying it here
  // lets the cron through without weakening the password gate for anyone else.
  if (url.pathname === '/api/send-reminders') {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return
  }

  const fakeReq = { headers: { cookie: request.headers.get('cookie') ?? undefined } } as unknown as Parameters<typeof isAuthorized>[0]
  if (await isAuthorized(fakeReq)) return

  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
