import { useEffect, useRef, useState } from 'react'

interface Props {
  onSave: (dataUrl: string) => Promise<void>
  onClose: () => void
}

const COLORS = ['#111827', '#ef4444', '#2563eb', '#16a34a']
const WIDTH = 700
const HEIGHT = 450

export default function SketchCanvas({ onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState(COLORS[0])
  const [lineWidth, setLineWidth] = useState(3)
  const drawingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  // The canvas is displayed scaled down (CSS width/height) from its internal
  // WIDTH x HEIGHT pixel buffer, so pointer coordinates need to be rescaled
  // back to buffer space — otherwise strokes drift from where the pen is.
  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawingRef.current = true
    setIsEmpty(false)
    const { x, y } = getPoint(e)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
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
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  async function handleSave() {
    const canvas = canvasRef.current
    if (!canvas) return
    setSaving(true)
    setError(null)
    try {
      const dataUrl = canvas.toDataURL('image/png')
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
          <h3 className="text-sm font-semibold text-slate-700">Nakresliť technický výkres</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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
          <span className="text-xs text-slate-500 ml-2">Hrúbka:</span>
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`px-2 py-1 rounded text-xs ${lineWidth === w ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {w}
            </button>
          ))}
          <button onClick={handleClear} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700">
            Vymazať všetko
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-auto border border-slate-200 rounded-md touch-none cursor-crosshair bg-white"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        />

        {error && <div className="text-red-600 text-xs">{error}</div>}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100">
            Zrušiť
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isEmpty}
            className="px-4 py-2 rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Ukladám…' : 'Uložiť výkres'}
          </button>
        </div>
      </div>
    </div>
  )
}
