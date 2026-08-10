const MAX_DATA_URL_BYTES = 3 * 1024 * 1024

export async function compressImageToDataUrl(file: File, maxDimension = 1600, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas nie je podporovaný.')
    ctx.drawImage(bitmap, 0, 0, width, height)

    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    bitmap.close()
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Súbor sa nepodarilo načítať.'))
    reader.readAsDataURL(file)
  })
}

export async function fileToStorableDataUrl(file: File): Promise<string> {
  const dataUrl = file.type.startsWith('image/') ? await compressImageToDataUrl(file) : await fileToDataUrl(file)

  if (dataUrl.length > MAX_DATA_URL_BYTES) {
    throw new Error('Súbor je príliš veľký (max. cca 3 MB po komprimácii). Skús menší súbor.')
  }

  return dataUrl
}
