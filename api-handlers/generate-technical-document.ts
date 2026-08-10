import type { IncomingMessage, ServerResponse } from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import ImageModule from 'docxtemplater-image-module-free'
import { imageSize } from 'image-size'
import { prisma } from '../lib/prisma.js'

interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = path.join(__dirname, '../templates/navrh-technickeho-riesenia.docx')

function decimalToComma(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace('.', ',')
}

const MAX_IMAGE_WIDTH = 450
const MAX_IMAGE_HEIGHT = 450

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Buffer.from(base64, 'base64')
}

// The module always names embedded images "image_generated_N.png" regardless of the
// actual bytes, which mismatches our JPEG data and can corrupt the image for the reader.
// We detect the real format in getImage and override the filename extension to match.
// A fresh module instance is required per request: docxtemplater refuses to attach the
// same module instance to more than one Docxtemplater instance.
function createImageModule() {
  let lastImageExtension = 'png'

  const module = new ImageModule({
    centered: true,
    getImage(tagValue: string) {
      const buffer = dataUrlToBuffer(tagValue)
      try {
        const { type } = imageSize(buffer)
        lastImageExtension = type === 'jpg' ? 'jpeg' : type ?? 'png'
      } catch {
        lastImageExtension = 'png'
      }
      return buffer
    },
    getSize(_img: Buffer, tagValue: string) {
      try {
        const { width, height } = imageSize(dataUrlToBuffer(tagValue))
        const scale = Math.min(1, MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height)
        return [Math.round(width * scale), Math.round(height * scale)]
      } catch {
        return [MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT]
      }
    },
  })

  module.getNextImageName = function getNextImageName(this: { imageNumber: number }) {
    const name = `image_generated_${this.imageNumber}.${lastImageExtension}`
    this.imageNumber += 1
    return name
  }

  return module
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const idParam = req.query.id
  const id = typeof idParam === 'string' ? idParam : undefined
  if (!id) {
    return res.status(400).json({ error: 'Chýba id cenovej alternatívy.' })
  }

  const alternative = await prisma.quoteAlternative.findUnique({
    where: { id },
    include: {
      inspection: {
        include: {
          customer: true,
          roofAreaSections: true,
          photos: true,
          sketch: true,
          technicalSolutionItems: { where: { isChecked: true }, include: { catalogItem: true } },
        },
      },
      materialComposition: { include: { featuredProduct: true } },
    },
  })

  if (!alternative) {
    return res.status(404).json({ error: 'Cenová alternatíva nebola nájdená.' })
  }

  const { customer, roofAreaSections, areaM2, currentStateDescription, photos, sketch, technicalSolutionItems } = alternative.inspection
  const composition = alternative.materialComposition

  const technickeOpatrenia = technicalSolutionItems.map((t) => {
    const parts = [t.catalogItem.name]
    if (t.valueNumber !== null) parts.push(`${decimalToComma(t.valueNumber)} ${t.catalogItem.unit}`)
    let riadok = parts.join(': ')
    if (t.notes) riadok += ` — poznámka: ${t.notes}`
    return { riadok }
  })

  const imagePhotos = photos.filter((p) => p.url.startsWith('data:image'))
  const sketchIsImage = sketch?.fileUrl?.startsWith('data:image') ?? false

  const areaLines: string[] = []
  if (areaM2 !== null) {
    areaLines.push(`Celková plocha strechy: ${decimalToComma(areaM2)} m².`)
  }
  if (roofAreaSections.length > 0) {
    const parts = roofAreaSections.map(
      (s) => `${s.label} (${decimalToComma(s.widthM)} × ${decimalToComma(s.heightM)} m = ${decimalToComma(s.areaM2)} m²)`,
    )
    areaLines.push(`Čiastkové plochy: ${parts.join(', ')}.`)
  }

  const data = {
    pracovisko: customer.siteAddress || customer.address || '',
    zakaznik_meno: customer.name,
    zakaznik_telefon: customer.phone ?? '',
    zakaznik_adresa: customer.address ?? '',
    alternativa_label: alternative.label,
    alternativa_popis: alternative.description ?? '',
    sucasny_stav: currentStateDescription ?? '',
    vymera_text: areaLines.length > 0 ? areaLines.join('\n') : '',
    skladba_vrstvy:
      composition && Array.isArray(composition.layersJson)
        ? (composition.layersJson as unknown[]).map((polozka) => ({ polozka }))
        : [],
    postup_prac: composition?.workStepsTemplate ?? '',
    technicke_opatrenia: technickeOpatrenia,
    technicky_produkt_nazov: composition?.featuredProduct?.name ?? '',
    technicky_produkt_popis: composition?.featuredProduct?.description ?? '',
    zaruka_roky: alternative.warrantyYears !== null ? String(alternative.warrantyYears) : '',
    fotky: imagePhotos.map((p) => ({ foto: p.url, caption: p.caption ?? '' })),
    ma_vykres: sketchIsImage,
    vykres_obrazok: sketchIsImage ? sketch!.fileUrl : '',
  }

  const templateBuffer = fs.readFileSync(TEMPLATE_PATH)
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
    modules: [createImageModule()],
  })

  doc.render(data)

  const outputBuffer = doc.getZip().generate({ type: 'nodebuffer' })

  const filename = `Navrh-technickeho-riesenia-${alternative.label}-${alternative.inspection.referenceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.docx`

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.status(200)
  res.end(outputBuffer)
}
