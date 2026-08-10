import { useRef, useState } from 'react'
import { deleteInspectionSketch, saveInspectionSketch } from '../../lib/api'
import { fileToStorableDataUrl } from '../../lib/image'
import SketchCanvas from '../SketchCanvas'
import type { InspectionDetail } from '../../types'

interface Props {
  inspection: InspectionDetail
  onChange: (patch: Partial<InspectionDetail>) => void
}

export default function SketchTab({ inspection, onChange }: Props) {
  const sketch = inspection.sketch
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [drawing, setDrawing] = useState(false)

  async function handleFileSelected(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const dataUrl = await fileToStorableDataUrl(file)
      const saved = await saveInspectionSketch({ inspectionId: inspection.id, fileUrl: dataUrl })
      onChange({ sketch: saved })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDrawnSave(dataUrl: string) {
    const saved = await saveInspectionSketch({ inspectionId: inspection.id, fileUrl: dataUrl })
    onChange({ sketch: saved })
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteInspectionSketch(inspection.id)
      onChange({ sketch: null })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  const isImage = sketch?.fileUrl?.startsWith('data:image')

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Technický výkres</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawing(true)}
            className="px-4 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
          >
            ✎ Nakresliť výkres
          </button>
          <label className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition cursor-pointer">
            {uploading ? 'Nahrávam…' : sketch ? 'Nahradiť súbor' : '+ Nahrať výkres'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              disabled={uploading}
              onChange={(e) => handleFileSelected(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {!sketch ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-slate-500 text-sm text-center">
          Zatiaľ žiadny výkres. Nahraj foto vlastnej kresby, odfotený papier alebo súbor.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          {isImage ? (
            <img src={sketch.fileUrl ?? ''} alt="Technický výkres" className="w-full rounded-md border border-slate-100" />
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm bg-slate-50 rounded-md">Súbor je nahraný (nie je obrázok, náhľad nie je k dispozícii).</div>
          )}
          <button onClick={handleDelete} disabled={deleting} className="text-xs font-medium text-red-500 hover:text-red-700">
            {deleting ? 'Mažem…' : 'Vymazať výkres'}
          </button>
        </div>
      )}

      {drawing && <SketchCanvas onSave={handleDrawnSave} onClose={() => setDrawing(false)} />}
    </div>
  )
}
