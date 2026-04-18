"use client"
import { useEffect, useRef } from "react"

export function CanvasBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    type Node = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; phase: number; phaseSpd: number }
    let nodes: Node[] = []
    let raf: number

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }

    function build() {
      const W = canvas!.width, H = canvas!.height
      const count = Math.max(18, Math.floor((W * H) / 28000))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: 2 + Math.random() * 2.5,
        alpha: 0.12 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
        phaseSpd: 0.007 + Math.random() * 0.008,
      }))
    }

    function tick() {
      const W = canvas!.width, H = canvas!.height
      ctx.clearRect(0, 0, W, H)

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.06
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(14,165,233,${alpha})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.phase += n.phaseSpd
        if (n.x < 0) n.x = W; if (n.x > W) n.x = 0
        if (n.y < 0) n.y = H; if (n.y > H) n.y = 0
        const a = n.alpha + Math.sin(n.phase) * 0.04
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(14,165,233,${a})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    resize()
    build()
    tick()

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
