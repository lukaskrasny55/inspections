import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { IncomingMessage, ServerResponse } from 'http'
import { isAuthEnabled, isAuthorized } from './lib/auth'

// Dev-only: routes /api/* requests to the local Vercel-style handler modules
// (Vercel itself serves them in preview/production; this just mirrors that
// locally so `npm run dev` works without the Vercel CLI).
function vercelApiDevMiddleware(): Plugin {
  return {
    name: 'vercel-api-dev-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse, next) => {
        try {
          const url = new URL(req.url || '/', 'http://localhost')
          let pathname = url.pathname === '/' ? '/index' : url.pathname

          if (isAuthEnabled() && !pathname.startsWith('/session-') && !(await isAuthorized(req))) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Unauthorized' }))
            return
          }

          // Handler modules live in api-handlers/, not api/ — the real api/
          // directory holds only the single handler.ts catch-all function
          // that production uses to stay under Vercel's per-deployment
          // function-count limit (see api/handler.ts for why).
          const modulePath = `/api-handlers${pathname}.ts`

          let mod
          try {
            mod = await server.ssrLoadModule(modulePath)
          } catch {
            // Some resources (the ones with an `[id]` sibling route) keep their
            // list/create handler at `<name>/index.ts` instead of `<name>.ts` —
            // Node's production ESM loader can't resolve a bare `<name>` import
            // when a same-named directory also exists, so those files were moved.
            try {
              mod = await server.ssrLoadModule(`/api-handlers${pathname}/index.ts`)
            } catch {
              // Fall back to dynamic segment file, e.g. /api/inspections/abc -> /api-handlers/inspections/[id].ts
              const segments = pathname.split('/').filter(Boolean)
              if (segments.length === 0) return next()
              const last = segments[segments.length - 1]
              const dynamicPath = `/api-handlers/${segments.slice(0, -1).join('/')}/[id].ts`.replace('//', '/')
              try {
                mod = await server.ssrLoadModule(dynamicPath)
                ;(req as any)._dynamicParam = last
              } catch {
                return next()
              }
            }
          }

          const handler = mod.default
          if (typeof handler !== 'function') return next()

          const query: Record<string, string> = {}
          url.searchParams.forEach((value, key) => {
            query[key] = value
          })
          if ((req as any)._dynamicParam) {
            query.id = (req as any)._dynamicParam
          }
          ;(req as any).query = query

          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const raw = Buffer.concat(chunks).toString('utf-8')
            try {
              ;(req as any).body = raw ? JSON.parse(raw) : {}
            } catch {
              ;(req as any).body = {}
            }
          }

          ;(res as any).status = (code: number) => {
            res.statusCode = code
            return res
          }
          ;(res as any).json = (body: unknown) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(body))
          }

          await handler(req, res)
        } catch (err) {
          console.error('[api dev middleware]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    vercelApiDevMiddleware(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'TMS Hydra – Obhliadky',
        short_name: 'Obhliadky',
        description: 'Digitalizácia obhliadok a cenových ponúk pre TMS-HYDRA.',
        theme_color: '#17191d',
        background_color: '#f6f5f2',
        display: 'standalone',
        // Tablet-only app: no portrait lock — the checklist/ponuka tables are
        // wide and are commonly used in landscape on a tablet.
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // API calls are handled by src/lib/offlineFetch.ts (IndexedDB cache + outbox
            // queue), not by workbox — always let them go straight to the network here.
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
  },
})
