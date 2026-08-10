import { useRef, useState } from 'react'
import { fileToStorableDataUrl } from '../lib/image'
import type { AdditionalService } from '../types'

interface Props {
  items: AdditionalService[]
  onCreate: (data: { description: string; photoUrl?: string }) => Promise<void>
  onUpdate: (id: string, data: Partial<{ description: string; photoUrl: string | null }>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function AdditionalServicesList({ items, onCreate, onUpdate, onDelete }: Props) {
  const [newDescription, setNewDescription] = useState('')
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [uploadingNew, setUploadingNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const newFileInputRef = useRef<HTMLInputElement>(null)

  async function handleNewPhotoSelected(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setUploadingNew(true)
    setError(null)
    try {
      setNewPhotoUrl(await fileToStorableDataUrl(file))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploadingNew(false)
    }
  }

  async function handleAdd() {
    if (!newDescription.trim()) return
    setCreating(true)
    setError(null)
    try {
      await onCreate({ description: newDescription.trim(), photoUrl: newPhotoUrl ?? undefined })
      setNewDescription('')
      setNewPhotoUrl(null)
      if (newFileInputRef.current) newFileInputRef.current.value = ''
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-red-600 text-xs">{error}</div>}

      {items.map((item) => (
        <ServiceCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
      ))}

      <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
        <input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="napr. Výmena zhnitého laťovania pri komíne"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
            {uploadingNew ? 'Nahrávam…' : newPhotoUrl ? 'Fotka pripravená ✓' : '+ Pridať fotku'}
            <input
              ref={newFileInputRef}
              type="file"
              accept="image/*"
              disabled={uploadingNew}
              onChange={(e) => handleNewPhotoSelected(e.target.files)}
              className="hidden"
            />
          </label>
          <button
            onClick={handleAdd}
            disabled={creating || !newDescription.trim()}
            className="text-xs font-medium text-white bg-slate-900 px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {creating ? '…' : '+ Pridať'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ServiceCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: AdditionalService
  onUpdate: (id: string, data: Partial<{ description: string; photoUrl: string | null }>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [description, setDescription] = useState(item.description)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoSelected(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const dataUrl = await fileToStorableDataUrl(file)
      await onUpdate(item.id, { photoUrl: dataUrl })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
      {item.photoUrl && (
        <img src={item.photoUrl} alt="" className="w-16 h-16 object-cover rounded-md shrink-0" />
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== item.description && onUpdate(item.id, { description })}
          className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-brand-400 rounded text-sm focus:outline-none bg-white"
        />
        {error && <div className="text-red-600 text-xs">{error}</div>}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
            {uploading ? 'Nahrávam…' : item.photoUrl ? 'Zmeniť fotku' : '+ Pridať fotku'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => handlePhotoSelected(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </div>
      <button onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-red-600 shrink-0" title="Vymazať">
        ×
      </button>
    </div>
  )
}
