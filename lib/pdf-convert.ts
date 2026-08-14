// Prevádza vygenerovaný DOCX (cenová ponuka / návrh riešenia) na PDF cez samostatnú
// Gotenberg službu (Docker, LibreOffice) bežiacu mimo Vercelu. Používame konverziu
// hotového DOCX namiesto vlastného PDF rendereru zámerne — DOCX šablóny (branding,
// rozloženie, fotky) zostávajú jediným zdrojom pravdy, PDF je len jeho mechanický
// derivát. Pozri PLAN-cenove-ponuky-PDF.md.

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://tms-gotenberg.fly.dev'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function basicAuthHeader(): string {
  const user = process.env.GOTENBERG_API_BASIC_AUTH_USERNAME
  const pass = process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD
  if (!user || !pass) {
    throw new Error('GOTENBERG_API_BASIC_AUTH_USERNAME / GOTENBERG_API_BASIC_AUTH_PASSWORD nie sú nastavené.')
  }
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
}

export async function convertDocxToPdf(buffer: Buffer, filename: string): Promise<Buffer> {
  const form = new FormData()
  form.append('files', new Blob([Uint8Array.from(buffer)], { type: DOCX_MIME }), filename)

  const outputName = filename.replace(/\.docx$/i, '')

  const res = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Gotenberg-Output-Filename': outputName,
    },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Konverzia na PDF zlyhala (${res.status}): ${text.slice(0, 300)}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
