import { useEffect, useRef, useState } from 'react'

interface Props {
  photoUrl: string
  onSave: (dataUrl: string) => Promise<void>
  onClose: () => void
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#111827']

export default function PhotoAnnotator({ photoUrl, onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const drawingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const maxWidth = Math.min(img.naturalWidth, 800)
      const scale = maxWidth / img.naturalWidth
      setSize({ width: maxWidth, height: Math.round(img.naturalHeight * scale) })
    }
    img.src = photoUrl
  }, [photoUrl])

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawingRef.current = true
    const { x, y } = getPoint(e)
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPoint(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function handlePointerUp() {
    drawingRef.current = false
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function handleSave() {
    const annotationCanvas = canvasRef.current
    if (!annotationCanvas) return
    setSaving(true)
    setError(null)
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Fotku sa nepodarilo načítať.'))
        img.src = photoUrl
      })

      const output = document.createElement('canvas')
      output.width = size.width
      output.height = size.height
      const ctx = output.getContext('2d')
      if (!ctx) throw new Error('Canvas nie je podporovaný.')
      ctx.drawImage(img, 0, 0, size.width, size.height)
      ctx.drawImage(annotationCanvas, 0, 0)

      const dataUrl = output.toDataURL('image/jpeg', 0.85)
      await onSave(dataUrl)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 max-w-3xl w-full space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Označiť na fotke</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Farba:</span>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-slate-900' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
          <button onClick={handleClear} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700">
            Vymazať kresbu
          </button>
        </div>

        {size.width > 0 && (
          <div className="relative mx-auto" style={{ width: size.width, height: size.height }}>
            <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" draggable={false} />
            <canvas
              ref={canvasRef}
              width={size.width}
              height={size.height}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="absolute inset-0 touch-none cursor-crosshair"
            />
          </div>
        )}

        {error && <div className="text-red-600 text-xs">{error}</div>}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100">
            Zrušiť
          </button>
          <button
            onClick={handleSave}
            disabled={saving || size.width === 0}
            className="px-4 py-2 rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Ukladám…' : 'Uložiť'}
          </button>
        </div>
      </div>
    </div>
  )
}
