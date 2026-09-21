import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  vr: number
  life: number
  maxLife: number
}

interface ConfettiBurstOptions {
  colors?: string[]
  particleCount?: number
  /** 0–1, horizontal origin as a ratio of the container width */
  originXRatio?: number
  /** 0–1, vertical origin as a ratio of the container height */
  originYRatio?: number
}

const DEFAULT_COLORS = ['#67e8f9', '#22d3ee', '#fbbf24', '#fcd34d', '#f8fafc']
const GRAVITY = 0.22
const DRAG = 0.992
const DURATION_MS = 1100

/**
 * Lightweight, dependency-free ribbon-confetti burst rendered on a <canvas>
 * that overlays `containerRef`. No-op if the container or canvas is missing.
 */
export function useConfettiBurst(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLElement | null>,
) {
  const rafRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const startRef = useRef(0)

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const burst = useCallback((options: ConfettiBurstOptions = {}) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const { colors = DEFAULT_COLORS, particleCount = 46, originXRatio = 0.5, originYRatio = 0.32 } = options
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const originX = rect.width * originXRatio
    const originY = rect.height * originYRatio

    particlesRef.current = Array.from({ length: particleCount }, () => {
      const angle = (Math.random() * Math.PI) + Math.PI // upward-ish spread
      const speed = 2.5 + Math.random() * 4
      return {
        x: originX + (Math.random() - 0.5) * 60,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        life: 0,
        maxLife: DURATION_MS,
      }
    })

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    startRef.current = performance.now()

    const step = (now: number) => {
      const elapsed = now - startRef.current
      ctx.clearRect(0, 0, rect.width, rect.height)

      let alive = false
      for (const p of particlesRef.current) {
        p.life = elapsed
        if (p.life >= p.maxLife) continue
        alive = true

        p.vy += GRAVITY
        p.vx *= DRAG
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.vr

        const fade = 1 - p.life / p.maxLife
        ctx.save()
        ctx.globalAlpha = Math.max(fade, 0)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }

      if (alive) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height)
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(step)
  }, [canvasRef, containerRef])

  return burst
}
