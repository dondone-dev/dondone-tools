import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  clampRectToBounds,
  moveRect,
  resizeRect,
  resizeRectWithRatio,
  type CropRect,
  type Handle,
} from '@/lib/tools/img-crop'

interface ImageCropCanvasProps {
  imageUrl: string
  naturalWidth: number
  naturalHeight: number
  rect: CropRect
  ratio: number | null
  onChange: (rect: CropRect) => void
}

const ALL_HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const LOCKED_HANDLES: ('nw' | 'ne' | 'se' | 'sw')[] = ['nw', 'ne', 'se', 'sw']

const HANDLE_POSITION: Record<Handle, string> = {
  nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
}

type DragState =
  | { kind: 'move'; startX: number; startY: number; startRect: CropRect }
  | { kind: 'resize'; handle: Handle; startX: number; startY: number; startRect: CropRect }

export function ImageCropCanvas({ imageUrl, naturalWidth, naturalHeight, rect, ratio, onChange }: ImageCropCanvasProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [scale, setScale] = useState(1)

  const measure = useCallback(() => {
    const el = imgRef.current
    if (!el || naturalWidth === 0) return
    setScale(el.clientWidth / naturalWidth)
  }, [naturalWidth])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current
    if (!drag || scale === 0) return
    const dx = (e.clientX - drag.startX) / scale
    const dy = (e.clientY - drag.startY) / scale

    let next: CropRect
    if (drag.kind === 'move') {
      next = moveRect(drag.startRect, dx, dy, naturalWidth, naturalHeight)
    } else if (ratio != null && (LOCKED_HANDLES as Handle[]).includes(drag.handle)) {
      next = resizeRectWithRatio(drag.startRect, drag.handle as 'nw' | 'ne' | 'se' | 'sw', ratio, dx)
    } else {
      next = resizeRect(drag.startRect, drag.handle, dx, dy)
    }
    onChange(clampRectToBounds(next, naturalWidth, naturalHeight))
  }, [scale, ratio, naturalWidth, naturalHeight, onChange])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  function startDrag(e: ReactPointerEvent, drag: DragState) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = drag
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const visibleHandles = ratio != null ? LOCKED_HANDLES : ALL_HANDLES

  return (
    <div className="relative inline-block max-w-full select-none">
      <img
        ref={imgRef}
        src={imageUrl}
        alt=""
        className="block max-w-full h-auto"
        onLoad={measure}
        draggable={false}
      />
      <div
        className="absolute cursor-move border-2 border-primary"
        style={{
          left: rect.x * scale,
          top: rect.y * scale,
          width: rect.width * scale,
          height: rect.height * scale,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        }}
        onPointerDown={(e) => startDrag(e, { kind: 'move', startX: e.clientX, startY: e.clientY, startRect: rect })}
      >
        {visibleHandles.map((handle) => (
          <div
            key={handle}
            className={cn('absolute h-3 w-3 rounded-full border-2 border-primary bg-background', HANDLE_POSITION[handle])}
            onPointerDown={(e) => startDrag(e, { kind: 'resize', handle, startX: e.clientX, startY: e.clientY, startRect: rect })}
          />
        ))}
      </div>
    </div>
  )
}
