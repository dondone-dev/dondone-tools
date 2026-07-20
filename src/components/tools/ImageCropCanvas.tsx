import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  clampRectToBounds,
  moveRect,
  resizeRect,
  resizeRectWithRatio,
  type CropRect,
  type Handle,
} from '@/lib/tools/img-crop'

const KEY_STEP = 10
const KEY_STEP_LARGE = 40

function arrowDelta(e: ReactKeyboardEvent): { dx: number; dy: number } | null {
  const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP
  if (e.key === 'ArrowLeft') return { dx: -step, dy: 0 }
  if (e.key === 'ArrowRight') return { dx: step, dy: 0 }
  if (e.key === 'ArrowUp') return { dx: 0, dy: -step }
  if (e.key === 'ArrowDown') return { dx: 0, dy: step }
  return null
}

function verticalDeltaToWidthDelta(handle: 'nw' | 'ne' | 'se' | 'sw', dy: number, ratio: number): number {
  const sign = handle === 'se' || handle === 'nw' ? 1 : -1
  return dy * ratio * sign
}

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
  const { t } = useTranslation('tools')
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const latestRef = useRef({ scale: 1, ratio, naturalWidth, naturalHeight, onChange })
  const [scale, setScale] = useState(1)

  useEffect(() => {
    latestRef.current = { scale, ratio, naturalWidth, naturalHeight, onChange }
  })

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
    const { scale, ratio, naturalWidth, naturalHeight, onChange } = latestRef.current
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
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  function startDrag(e: ReactPointerEvent, drag: DragState) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = drag
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  function handleMoveKeyDown(e: ReactKeyboardEvent) {
    const delta = arrowDelta(e)
    if (!delta) return
    e.preventDefault()
    e.stopPropagation()
    onChange(clampRectToBounds(moveRect(rect, delta.dx, delta.dy, naturalWidth, naturalHeight), naturalWidth, naturalHeight))
  }

  function handleResizeKeyDown(e: ReactKeyboardEvent, handle: Handle) {
    const delta = arrowDelta(e)
    if (!delta) return
    e.preventDefault()
    e.stopPropagation()
    const next =
      ratio != null && (LOCKED_HANDLES as Handle[]).includes(handle)
        ? resizeRectWithRatio(
            rect,
            handle as 'nw' | 'ne' | 'se' | 'sw',
            ratio,
            delta.dx !== 0 ? delta.dx : verticalDeltaToWidthDelta(handle as 'nw' | 'ne' | 'se' | 'sw', delta.dy, ratio),
          )
        : resizeRect(rect, handle, delta.dx, delta.dy)
    onChange(clampRectToBounds(next, naturalWidth, naturalHeight))
  }

  const visibleHandles = ratio != null ? LOCKED_HANDLES : ALL_HANDLES

  return (
    <div className="relative inline-block max-w-full overflow-hidden select-none">
      <img
        ref={imgRef}
        src={imageUrl}
        alt=""
        className="block max-w-full h-auto"
        onLoad={measure}
        draggable={false}
      />
      <div
        className="absolute cursor-move border-2 border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          left: rect.x * scale,
          top: rect.y * scale,
          width: rect.width * scale,
          height: rect.height * scale,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        }}
        role="button"
        tabIndex={0}
        aria-label={t('img-crop.moveHandle')}
        onPointerDown={(e) => startDrag(e, { kind: 'move', startX: e.clientX, startY: e.clientY, startRect: rect })}
        onKeyDown={handleMoveKeyDown}
      >
        {visibleHandles.map((handle) => (
          <div
            key={handle}
            role="button"
            tabIndex={0}
            aria-label={t('img-crop.resizeHandle')}
            className={cn(
              'absolute h-3 w-3 rounded-full border-2 border-primary bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              HANDLE_POSITION[handle],
            )}
            onPointerDown={(e) => startDrag(e, { kind: 'resize', handle, startX: e.clientX, startY: e.clientY, startRect: rect })}
            onKeyDown={(e) => handleResizeKeyDown(e, handle)}
          />
        ))}
      </div>
    </div>
  )
}
