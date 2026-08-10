import type { IncomingMessage, ServerResponse } from 'http'

// A single Vercel Serverless Function fanning out to every route handler.
// Vercel's Hobby plan caps a deployment at 12 functions — this app has ~46
// distinct endpoints, so each api/*.ts file used to become its own function
// and blew past that limit. Consolidating behind one catch-all keeps every
// handler as its own module (imported statically so esbuild can bundle them
// — a dynamic `import()` built from a runtime string, like the local dev
// middleware below uses, can't be bundled for production) while only
// counting as a single function against the plan limit.
//
// This is a plain-named file (not `api/[...path].ts`) reached via the
// `/api/(.*)` -> `/api/handler?path=$1` rewrite in vercel.json. A bracket
// catch-all filename was tried first but any request past a single path
// segment (e.g. `/api/inspections/<id>`) that passed Edge Middleware came
// back as a platform-level 404 instead of reaching this function — a routing
// quirk specific to `[...param]` catch-alls outside a Next.js build. The
// explicit rewrite sidesteps that mechanism entirely.

// Handlers whose route name also has a same-named directory (the `[id]`
// sibling) import via an explicit `/index` — Node's ESM loader, unlike
// bundler-mode TS resolution, refuses to resolve a bare `../foo` specifier
// when both `foo.js` and a `foo/` directory exist (ERR_UNSUPPORTED_DIR_IMPORT)
// — so those handler files live at `api-handlers/<name>/index.ts`.
import additionalServices from '../api-handlers/additional-services/index.js'
import additionalServicesId from '../api-handlers/additional-services/[id].js'
import sessionCheck from '../api-handlers/session-check.js'
import sessionLogin from '../api-handlers/session-login.js'
import sessionLogout from '../api-handlers/session-logout.js'
import calendarEvents from '../api-handlers/calendar-events/index.js'
import calendarEventsId from '../api-handlers/calendar-events/[id].js'
import checklistItemCatalog from '../api-handlers/checklist-item-catalog/index.js'
import checklistItemCatalogId from '../api-handlers/checklist-item-catalog/[id].js'
import companySettings from '../api-handlers/company-settings.js'
import customersId from '../api-handlers/customers/[id].js'
import documentTemplates from '../api-handlers/document-templates/index.js'
import documentTemplatesId from '../api-handlers/document-templates/[id].js'
import drainDownspouts from '../api-handlers/drain-downspouts/index.js'
import drainDownspoutsId from '../api-handlers/drain-downspouts/[id].js'
import generatePlanDocument from '../api-handlers/generate-plan-document.js'
import generateQuoteDocument from '../api-handlers/generate-quote-document.js'
import generateTechnicalDocument from '../api-handlers/generate-technical-document.js'
import gutterSystemItems from '../api-handlers/gutter-system-items/index.js'
import gutterSystemItemsId from '../api-handlers/gutter-system-items/[id].js'
import inspectionPhotos from '../api-handlers/inspection-photos/index.js'
import inspectionPhotosId from '../api-handlers/inspection-photos/[id].js'
import inspectionSketch from '../api-handlers/inspection-sketch.js'
import inspections from '../api-handlers/inspections/index.js'
import inspectionsId from '../api-handlers/inspections/[id].js'
import inspectionsDuplicate from '../api-handlers/inspections/duplicate.js'
import materialCompositions from '../api-handlers/material-compositions/index.js'
import materialCompositionsId from '../api-handlers/material-compositions/[id].js'
import materialProducts from '../api-handlers/material-products/index.js'
import materialProductsId from '../api-handlers/material-products/[id].js'
import plan from '../api-handlers/plan.js'
import priceList from '../api-handlers/price-list/index.js'
import priceListId from '../api-handlers/price-list/[id].js'
import quoteAlternatives from '../api-handlers/quote-alternatives/index.js'
import quoteAlternativesId from '../api-handlers/quote-alternatives/[id].js'
import quoteLineItems from '../api-handlers/quote-line-items/index.js'
import quoteLineItemsId from '../api-handlers/quote-line-items/[id].js'
import roofAreaSections from '../api-handlers/roof-area-sections/index.js'
import roofAreaSectionsId from '../api-handlers/roof-area-sections/[id].js'
import roofEdges from '../api-handlers/roof-edges/index.js'
import roofEdgesId from '../api-handlers/roof-edges/[id].js'
import sendQuoteEmail from '../api-handlers/send-quote-email.js'
import sendReminders from '../api-handlers/send-reminders.js'
import technicalSolutionItems from '../api-handlers/technical-solution-items/index.js'
import technicalSolutionItemsId from '../api-handlers/technical-solution-items/[id].js'
import technicians from '../api-handlers/technicians/index.js'
import techniciansId from '../api-handlers/technicians/[id].js'
import workSummary from '../api-handlers/work-summary.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
  body: any
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

type Handler = (req: any, res: any) => unknown

// Static (non-dynamic) routes, keyed by the path after `/api/`.
const STATIC_ROUTES: Record<string, Handler> = {
  'additional-services': additionalServices,
  'session-check': sessionCheck,
  'session-login': sessionLogin,
  'session-logout': sessionLogout,
  'calendar-events': calendarEvents,
  'checklist-item-catalog': checklistItemCatalog,
  'company-settings': companySettings,
  'document-templates': documentTemplates,
  'drain-downspouts': drainDownspouts,
  'generate-plan-document': generatePlanDocument,
  'generate-quote-document': generateQuoteDocument,
  'generate-technical-document': generateTechnicalDocument,
  'gutter-system-items': gutterSystemItems,
  'inspection-photos': inspectionPhotos,
  'inspection-sketch': inspectionSketch,
  inspections: inspections,
  'inspections/duplicate': inspectionsDuplicate,
  'material-compositions': materialCompositions,
  'material-products': materialProducts,
  plan: plan,
  'price-list': priceList,
  'quote-alternatives': quoteAlternatives,
  'quote-line-items': quoteLineItems,
  'roof-area-sections': roofAreaSections,
  'roof-edges': roofEdges,
  'send-quote-email': sendQuoteEmail,
  'send-reminders': sendReminders,
  'technical-solution-items': technicalSolutionItems,
  technicians: technicians,
  'work-summary': workSummary,
}

// Dynamic `[id]` routes, keyed by the parent path (path minus the trailing id segment).
const DYNAMIC_ROUTES: Record<string, Handler> = {
  'additional-services': additionalServicesId,
  'calendar-events': calendarEventsId,
  'checklist-item-catalog': checklistItemCatalogId,
  customers: customersId,
  'document-templates': documentTemplatesId,
  'drain-downspouts': drainDownspoutsId,
  'gutter-system-items': gutterSystemItemsId,
  'inspection-photos': inspectionPhotosId,
  inspections: inspectionsId,
  'material-compositions': materialCompositionsId,
  'material-products': materialProductsId,
  'price-list': priceListId,
  'quote-alternatives': quoteAlternativesId,
  'quote-line-items': quoteLineItemsId,
  'roof-area-sections': roofAreaSectionsId,
  'roof-edges': roofEdgesId,
  'technical-solution-items': technicalSolutionItemsId,
  technicians: techniciansId,
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // In production this file is reached via the vercel.json rewrite
  // `/api/(.*)` -> `/api/handler?path=$1`, which populates `path` as a plain
  // string. Locally (vite dev middleware) there is no rewrite, so fall back to
  // parsing the incoming URL directly.
  const queryPath = req.query.path
  const rawPath = typeof queryPath === 'string' ? queryPath : (req.url || '').split('?')[0].replace(/^\/api\//, '')
  const pathArray = rawPath.split('/').filter(Boolean)
  const pathname = pathArray.join('/')

  const staticHandler = STATIC_ROUTES[pathname]
  if (staticHandler) {
    await staticHandler(req, res)
    return
  }

  if (pathArray.length > 0) {
    const parent = pathArray.slice(0, -1).join('/')
    const dynamicHandler = DYNAMIC_ROUTES[parent]
    if (dynamicHandler) {
      req.query.id = pathArray[pathArray.length - 1]
      await dynamicHandler(req, res)
      return
    }
  }

  res.status(404).json({ error: 'Not found' })
}
