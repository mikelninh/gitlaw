/**
 * Canvas-basierter Unterschriften-Pad für Mobilgeräte und Desktop.
 *
 * Touch-Events + Mouse-Events. Pixel-Ratio-aware (kein Unschärfe-Blur auf Retina).
 * Gibt dataUrl (PNG) zurück — Streifen des data:-Prefixes übernimmt der Aufrufer.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  /** Mindesthöhe des Canvas in CSS-Pixeln. Default 220. */
  minHeight?: number
  onSave: (dataUrl: string) => void
  labelClear: string
  labelSave: string
  hint?: string
}

export default function SignaturePad({ minHeight = 220, onSave, labelClear, labelSave, hint }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  // Setzt Canvasgröße auf physische Pixel (Retina-safe)
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    initCanvas()
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(() => {
      initCanvas()
      setHasStrokes(false)
    })
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [initCanvas])

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      if (!e.touches[0]) return null
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    drawingRef.current = true
    const pos = getPos(e)
    if (!pos) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawingRef.current) return
    e.preventDefault()
    const pos = getPos(e)
    if (!pos) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    if (!hasStrokes) setHasStrokes(true)
  }

  function stopDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    drawingRef.current = false
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="space-y-3">
      {hint && (
        <p className="text-sm text-[var(--color-ink-soft)]">{hint}</p>
      )}

      <div
        className="border-2 border-dashed border-[var(--color-border)] rounded-xl overflow-hidden bg-white touch-none"
        style={{ minHeight }}
      >
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ height: minHeight, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 border border-[var(--color-border)] rounded-xl py-3 text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-alt)] active:bg-[var(--color-bg-alt)] transition-colors"
        >
          {labelClear}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasStrokes}
          className="flex-1 bg-[var(--color-ink)] text-white rounded-xl py-3 text-sm font-medium disabled:opacity-40 hover:opacity-90 active:opacity-90 transition-opacity"
        >
          {labelSave}
        </button>
      </div>
    </div>
  )
}
