"use client"

import React, { useEffect, useState } from "react"
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern"
import { EncryptedText } from "@/components/ui/encrypted-text"

// "FIDELIO" = 7 chars × 80ms reveal + 300ms pause + 400ms fade = ~1.3s total
const REVEAL_DELAY_MS = 58.32
const TEXT = "FIDELIO"
const PAUSE_AFTER_REVEAL = 800
const FADE_DURATION = 900
const DISMISS_AFTER = TEXT.length * REVEAL_DELAY_MS + PAUSE_AFTER_REVEAL

interface FidelioIntroProps {
  onComplete: () => void
}

export function FidelioIntro({ onComplete }: FidelioIntroProps) {
  const [mounted, setMounted] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const fadeTimer = setTimeout(() => setFading(true), DISMISS_AFTER)
    const doneTimer = setTimeout(() => onComplete(), DISMISS_AFTER + FADE_DURATION)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [mounted, onComplete])

  if (!mounted) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease`,
        pointerEvents: fading ? "none" : "all",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 50%, transparent 100%)",
        }}
      >
        <InteractiveGridPattern
          squares={[80, 80]}
          className="opacity-90"
          squaresClassName="hover:fill-sky-400/20"
        />
      </div>

      <span
        className="Times New Roman"
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: "clamp(4rem, 10vw, 4rem)",
          fontWeight: 30,
          letterSpacing: "0.09em",
          color: "white",
        }}
      >
        <EncryptedText
          text={TEXT}
          revealDelayMs={REVEAL_DELAY_MS}
          flipDelayMs={40}
          encryptedClassName="opacity-20"
          revealedClassName="opacity-100"
        />
      </span>
    </div>
  )
}
