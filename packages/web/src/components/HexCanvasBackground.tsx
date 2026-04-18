"use client"
import { useEffect, useRef } from "react"

export function HexCanvasBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    type Hex = { x: number; y: number; r: number; vx: number; vy: number; rot: number; rotSpeed: number; baseAlpha: number; phase: number; phaseSpd: number }
    let hexagons: Hex[] = []
    let raf: number

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }

    function build() {
      const W = canvas!.width, H = canvas!.height
      const count = Math.max(22, Math.floor((W * H) / 22000))
      hexagons = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 28 + Math.random() * 52,
        vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.0018,
        baseAlpha: 0.045 + Math.random() * 0.13,
        phase: Math.random() * Math.PI * 2,
        phaseSpd: 0.006 + Math.random() * 0.009,
      }))
    }

    function hexPath(cx: number, cy: number, r: number) {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
    }

    function tick() {
      const W = canvas!.width, H = canvas!.height
      ctx.clearRect(0, 0, W, H)

      for (let i = 0; i < hexagons.length; i++) {
        for (let j = i + 1; j < hexagons.length; j++) {
          const a = hexagons[i], b = hexagons[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < 190) {
            const alpha = (1 - dist / 190) * 0.055
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(14,165,233,${alpha})`
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }

      for (const h of hexagons) {
        h.x += h.vx; h.y += h.vy; h.rot += h.rotSpeed; h.phase += h.phaseSpd
        if (h.x < -h.r * 2) h.x = W + h.r; if (h.x > W + h.r * 2) h.x = -h.r
        if (h.y < -h.r * 2) h.y = H + h.r; if (h.y > H + h.r * 2) h.y = -h.r
        const alpha = h.baseAlpha + Math.sin(h.phase) * 0.028
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot)
        hexPath(0, 0, h.r)
        ctx.strokeStyle = `rgba(14,165,233,${alpha})`; ctx.lineWidth = 1; ctx.stroke()
        if (h.r > 55) {
          hexPath(0, 0, h.r * 0.52)
          ctx.strokeStyle = `rgba(14,165,233,${alpha * 0.45})`; ctx.lineWidth = 0.5; ctx.stroke()
        }
        ctx.restore()
      }

      raf = requestAnimationFrame(tick)
    }

    resize(); build(); tick()
    const onResize = () => { resize(); build() }
    window.addEventListener("resize", onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize) }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  )
}
