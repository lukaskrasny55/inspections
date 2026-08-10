import { useRef, useState } from 'react'
import { createInspectionPhoto, deleteInspectionPhoto, updateInspectionPhoto } from '../../lib/api'
import { fileToStorableDataUrl } from '../../lib/image'
import PhotoAnnotator from '../PhotoAnnotator'
import type { InspectionDetail, InspectionPhoto } from '../../types'

interface Props {
  inspection: InspectionDetail
  onChange: (patch: Partial<InspectionDetail>) => void
}

export default function PhotosTab({ inspection, onChange }: Props) {
  const photos = inspection.photos
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [annotatingPhoto, setAnnotatingPhoto] = useState<InspectionPhoto | null>(null)

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setError(null)
    try {
      let current = photos
      for (const file of Array.from(fileList)) {
        const dataUrl = await fileToStorableDataUrl(file)
        const created = await createInspectionPhoto({ inspectionId: inspection.id, url: dataUrl })
        current = [...current, created]
      }
      onChange({ photos: current })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleCaptionBlur(photo: InspectionPhoto, value: string) {
    if (value === (photo.caption ?? '')) return
    setBusyId(photo.id)
    try {
      const updated = await updateInspectionPhoto(photo.id, { caption: value || null })
      onChange({ photos: photos.map((p) => (p.id === photo.id ? { ...p, ...updated } : p)) })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleSaveAnnotation(photo: InspectionPhoto, dataUrl: string) {
    const updated = await updateInspectionPhoto(photo.id, { url: dataUrl })
    onChange({ photos: photos.map((p) => (p.id === photo.id ? { ...p, ...updated } : p)) })
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await deleteInspectionPhoto(id)
      onChange({ photos: photos.filter((p) => p.id !== id) })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Fotky strechy</h2>
        <label className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition cursor-pointer">
          {uploading ? 'Nahrávam…' : '+ Pridať fotky'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            disabled={uploading}
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />
        </label>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {photos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-slate-500 text-sm text-center">
          Zatiaľ žiadne fotky. Pridaj ich tlačidlom vyššie.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-40 object-cover" />
              <div className="p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    defaultValue={photo.caption ?? ''}
                    placeholder="Popis fotky…"
                    disabled={busyId === photo.id}
                    onBlur={(e) => handleCaptionBlur(photo, e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-transparent hover:border-slate-200 focus:border-brand-400 rounded focus:outline-none"
                  />
                  <button
                    onClick={() => handleDelete(photo.id)}
                    disabled={busyId === photo.id}
                    className="text-slate-400 hover:text-red-600 shrink-0"
                    title="Vymazať"
                  >
                    ×
                  </button>
                </div>
                <button
                  onClick={() => setAnnotatingPhoto(photo)}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  ✎ Označiť na fotke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {annotatingPhoto && (
        <PhotoAnnotator
          photoUrl={annotatingPhoto.url}
          onSave={(dataUrl) => handleSaveAnnotation(annotatingPhoto, dataUrl)}
          onClose={() => setAnnotatingPhoto(null)}
        />
      )}
    </div>
  )
}
