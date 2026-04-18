"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { HexCanvasBackground } from "@/components/HexCanvasBackground"
import { useScrollReveal } from "@/hooks/useScrollReveal"
import { Android } from "@/components/ui/android"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { FidelioIntro } from "@/components/FidelioIntro"

export default function FidelioPage() {
  const [showIntro, setShowIntro] = useState(true)
  useScrollReveal()
  const clipRef = useRef<SVGRectElement>(null)

  // Animated SVG mark draw-on
  useEffect(() => {
    const items = document.querySelectorAll(".hero-seq-item")
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), 300 + i * 160)
    })

    const rect = clipRef.current
    if (!rect) return
    const totalHeight = 130
    let start: number | null = null
    rect.setAttribute("height", "0")

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    setTimeout(() => {
      function step(ts: number) {
        if (!rect) return
        if (!start) start = ts
        const t = Math.min((ts - start) / 2600, 1)
        rect.setAttribute("height", String(totalHeight * easeInOutCubic(t)))
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, 150)
  }, [])

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", fontFamily: "var(--font-body)", position: "relative" }}>
      {showIntro && <FidelioIntro onComplete={() => setShowIntro(false)} />}
      <HexCanvasBackground />

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "64px",
        background: "rgba(10,15,20,0.88)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        animation: "fadeIn 0.6s ease-out both",
      }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        <Link href="/" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>← HNDA</Link>
        <div style={{ display: "flex", gap: "1.75rem", alignItems: "center" }}>
          <a href="#actors" style={navLink}>Network</a>
          <a href="#how" style={navLink}>How it Works</a>
          <a href="#token" style={navLink}>CATR</a>
          <a href="#contact" style={{ ...navLink, background: "var(--accent)", color: "#fff", padding: "0.4rem 1rem", borderRadius: "999px", fontWeight: 600 }}>Join Network</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 2rem 4rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "4rem" }}>

          {/* Left — text */}
          <div style={{ textAlign: "left" }}>
            {/* Animated FIDELIO mark + badge row */}
            <div className="hero-seq-item" style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "2rem" }}>
              <svg viewBox="-58 -65 116 130" width="80" height="80" xmlns="http://www.w3.org/2000/svg" aria-label="FIDELIO mark">
                <defs>
                  <linearGradient id="mark-grad" x1="0" y1="-55" x2="0" y2="55" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c8a84b"/>
                    <stop offset="52%" stopColor="#d9bc6e"/>
                    <stop offset="100%" stopColor="#ffffff"/>
                  </linearGradient>
                  <clipPath id="hero-mark-clip">
                    <rect ref={clipRef} x="-58" y="-65" width="116" height="0" />
                  </clipPath>
                </defs>
                <g clipPath="url(#hero-mark-clip)">
                  <path d="M -13,-42.5 L 0,-50 L 13,-42.5 M 30.3,-32.5 L 43.3,-25 L 43.3,-10 M 43.3,10 L 43.3,25 L 30.3,32.5 M 13,42.5 L 0,50 L -13,42.5 M -30.3,32.5 L -43.3,25 L -43.3,10 M -43.3,-10 L -43.3,-25 L -30.3,-32.5"
                        fill="none" stroke="url(#mark-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </svg>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Live on Base · Testnet Active</span>
              </div>
            </div>

            <h1 className="hero-seq-item" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: "1.5rem" }}>
              Honduras pays<br /><span style={{ color: "var(--accent)" }}>on its own terms.</span>
            </h1>

            <p className="hero-seq-item" style={{ fontSize: "1.05rem", color: "var(--muted)", maxWidth: "480px", lineHeight: 1.7, marginBottom: "2.5rem" }}>
              <span className="stencil">FIDELIO</span> is a{" "}
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>closed-loop loyalty network</span>{" "}
              built for Honduran merchants and clients — backed by CATR, a token on Base that moves with every transaction.
            </p>

            <div className="hero-seq-item" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="#actors" style={{ textDecoration: "none" }}>
                <InteractiveHoverButton className="border-[var(--accent)] text-[var(--text)] bg-[var(--bg)]">Explore the Network</InteractiveHoverButton>
              </a>
              <a href="#how" style={{ textDecoration: "none" }}>
                <InteractiveHoverButton className="border-[var(--border)] text-[var(--text)] bg-[var(--bg)]">How it Works</InteractiveHoverButton>
              </a>
            </div>
          </div>

          {/* Right — Android phone mock */}
          <div className="hero-seq-item" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Android width={380} height={712} style={{ filter: "drop-shadow(0 32px 64px rgba(0,0,0,0.7)) drop-shadow(0 8px 24px rgba(14,165,233,0.15))" }}>
              <div style={{ width: "100%", height: "100%", background: "#0a0f14", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", fontSize: "13px", color: "#f1f5f9" }}>
                {/* Status bar */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px 4px", fontSize: "11px", color: "#94a3b8" }}>
                  <span>9:41</span>
                  <span>▲ ◼ 100%</span>
                </div>
                {/* App top bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 12px", borderBottom: "1px solid #1e293b" }}>
                  <span style={{ fontWeight: 800, letterSpacing: "0.06em", fontSize: "15px", color: "#f1f5f9" }}>FIDELIO</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8", background: "#1e293b", padding: "3px 8px", borderRadius: "999px" }}>HNDA</span>
                </div>
                {/* Tab bar */}
                <div style={{ display: "flex", borderBottom: "1px solid #1e293b" }}>
                  <div style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: "12px", color: "#64748b" }}>Client</div>
                  <div style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: "12px", color: "#0ea5e9", borderBottom: "2px solid #0ea5e9", fontWeight: 700 }}>Merchant</div>
                </div>
                {/* CATR balance card */}
                <div style={{ margin: "16px 12px 0", background: "linear-gradient(135deg, #0f172a, #1e293b)", border: "1px solid #1e3a5f", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>CATR Balance</div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#c8a84b", letterSpacing: "-0.02em" }}>464,129.92</div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>≈ L. 464,129.92 HNL</div>
                </div>
                {/* Redeem button */}
                <div style={{ margin: "12px 12px 0" }}>
                  <div style={{ background: "#0ea5e9", borderRadius: "10px", padding: "10px", textAlign: "center", fontWeight: 700, fontSize: "13px", color: "#fff" }}>
                    Redeem CATR → HNL
                  </div>
                </div>
                {/* Recent transactions */}
                <div style={{ margin: "16px 12px 0" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Recent Transactions</div>
                  {[
                    { wallet: "0xA3f1...9cB2", amount: "+120.00", time: "Today 14:32" },
                    { wallet: "0xB8d4...2eA7", amount: "+85.50",  time: "Today 11:15" },
                    { wallet: "0xC2e9...7fD1", amount: "+340.00", time: "Yesterday" },
                  ].map((tx, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "#e2e8f0" }}>{tx.wallet}</div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{tx.time}</div>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#22c55e" }}>{tx.amount} CATR</div>
                    </div>
                  ))}
                </div>
              </div>
            </Android>
          </div>

        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Actors ── */}
      <section id="actors" style={{ ...section, position: "relative", zIndex: 1 }}>
        <div style={sectionInner}>
          <div style={{ marginBottom: "3rem" }} data-reveal>
            <p style={label}>Three pillars</p>
            <h2 style={h2}>One network. Three roles.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              {
                icon: "🧑", role: "For Clients", title: "Earn as you pay.", accent: "var(--accent)",
                desc: "Every purchase with FIDELIO earns CATR — a token that lives in your wallet and grows with your loyalty to the network.",
                perks: ["Instant CATR rewards on every transaction", "Milestone bonuses at 5, 10, and 25 purchases", "Cross-merchant bonus when you explore the network", "No crypto knowledge required — H-Wallet included"],
              },
              {
                icon: "🏪", role: "For Merchants", title: "Redeem on your terms.", accent: "var(--gold)",
                desc: "Accept CATR, build a loyal customer base, and redeem tokens directly to Lempiras — a transparent, on-chain settlement you can verify yourself.",
                perks: ["Accept CATR payments from any network client", "Redeem CATR → Lempiras at any time", "Transparent on-chain settlement — no black boxes", "Earn GCA — your stake in the HNDA network"],
              },
              {
                icon: "🏦", role: "HNDA Treasury", title: "The network operator.", accent: "#6366f1",
                desc: "HNDA backs every CATR mint with real Lempiras, maintains the VaultOp (Gnosis Safe), and distributes rewards — a sovereign financial layer for Honduras.",
                perks: ["3.6% commission on every CATR transfer", "65% to treasury · 35% to reward pool", "High-value redemptions secured by 2-of-2 multisig", "Long-term: self-hosted Base node on Honduran hardware"],
              },
            ].map((a, i) => (
              <div key={a.role} style={card} data-reveal data-delay={String(i + 1)}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{a.icon}</div>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: a.accent, marginBottom: "0.5rem" }}>{a.role}</p>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.75rem" }}>{a.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>{a.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {a.perks.map((p) => (
                    <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.88rem", color: "var(--muted)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.accent, display: "inline-block", marginTop: "0.45rem", flexShrink: 0 }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── How it Works ── */}
      <section id="how" style={{ ...section, position: "relative", zIndex: 1 }}>
        <div style={sectionInner}>
          <div style={{ marginBottom: "3rem" }} data-reveal>
            <p style={label}>The payment loop</p>
            <h2 style={h2}>Mint before pay.<br />Burn before redeem.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
            {[
              { num: "01", tag: "Client",   title: "Generate reference", desc: "Client enters an amount in the app. FIDELIO generates a unique reference code tied to their wallet." },
              { num: "02", tag: "Bank",     title: "Transfer Lempiras",  desc: "Client transfers Lempiras to HNDA's Atlántida account with the reference code in the memo." },
              { num: "03", tag: "MerL1nk", title: "Detect & mint CATR", desc: "MerL1nk reads the bank notification, validates the reference, and mints CATR to the client's wallet on Base." },
              { num: "04", tag: "Merchant", title: "Spend & redeem",     desc: "Client spends CATR at a merchant. Merchant burns CATR and receives Lempiras from HNDA treasury." },
            ].map((s, i) => (
              <div key={s.num} style={card} data-reveal data-delay={String(i + 1)}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "rgba(255,255,255,0.08)", lineHeight: 1, marginBottom: "0.5rem" }}>{s.num}</div>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.5rem" }}>{s.tag}</p>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{s.title}</h4>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: "16px", padding: "2rem" }} data-reveal>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem" }}>Non-negotiable invariants</p>
            <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "0.95rem" }}>
              <strong style={{ color: "var(--text)" }}>MINT-BEFORE-PAY</strong> — CATR is only created after payment is confirmed on-chain.{" "}
              <strong style={{ color: "var(--text)" }}>BURN-BEFORE-REDEEM</strong> — Lempiras are only released after CATR is destroyed.
              These rules are hardcoded in the smart contract and enforced at every layer.
            </p>
          </div>
        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Token Stats ── */}
      <section id="token" style={{ ...section, position: "relative", zIndex: 1 }}>
        <div style={sectionInner}>
          <div style={{ marginBottom: "3rem" }} data-reveal>
            <p style={label}>CATR Token · Base (Ethereum L2)</p>
            <h2 style={h2}>Designed to stay honest.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            {[
              { val: "50M",  sub: "Supply cap",            detail: "Revolving closed loop" },
              { val: "3.6%", sub: "Commission per transfer", detail: "65% treasury · 35% rewards" },
              { val: "2/2",  sub: "Multisig (VaultOp)",    detail: "High-value redemptions" },
              { val: "L2",   sub: "Built on Base",          detail: "Low fees, Ethereum security" },
            ].map((s, i) => (
              <div key={s.sub} style={{ ...card, textAlign: "center" }} data-reveal data-delay={String(i + 1)}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text)", marginBottom: "0.5rem" }}>{s.val}</div>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>{s.sub}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{s.detail}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }} data-reveal>
            {["Live on Base Sepolia Testnet", "CATRToken.sol · Verified", "1 CATR = 1 HNL"].map((b) => (
              <span key={b} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "999px", padding: "0.35rem 1rem", fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Sovereignty ── */}
      <section style={{ ...section, textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }} data-reveal>
          <p style={label}>HNDA · Honduras Digital Assets</p>
          <blockquote style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 700, lineHeight: 1.5, color: "var(--text)", fontStyle: "italic", margin: "0 0 1.5rem" }}>
            "The business of the Honduran people is{" "}
            <span style={{ color: "var(--accent)" }}>Honduran people's business.</span>"
          </blockquote>
          <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.8 }}>
            FIDELIO is built to minimize foreign entities in the critical path of a Honduran financial transaction — not as a reaction to threat, but as a statement of sovereignty. CATR is auditable, transparent, and honest because it lives on a public blockchain. Those guarantees don't exist in a database row.
          </p>
        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Contact / Footer ── */}
      <footer id="contact" style={{ padding: "3rem 2rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }} data-reveal>
            <h2 style={{ ...h2, textAlign: "center", marginBottom: "1rem" }}>Ready to join the network?</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>Merchants, investors, developers — reach out.</p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="mailto:rodriguez.cjrp@outlook.com" style={{ textDecoration: "none" }}>
                <InteractiveHoverButton className="border-[var(--accent)] text-[var(--text)] bg-[var(--bg)]">Contact HNDA</InteractiveHoverButton>
              </a>
              <Link href="/" style={{ textDecoration: "none" }}>
                <InteractiveHoverButton className="border-[var(--border)] text-[var(--text)] bg-[var(--bg)]">← Back to HNDA</InteractiveHoverButton>
              </Link>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span className="stencil" style={{ fontWeight: 800, fontSize: "1rem" }}>FIDELIO <span style={{ fontWeight: 400, color: "var(--muted)", fontFamily: "var(--font-body)" }}>by HNDA</span></span>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <a href="#actors" style={footerLink}>Network</a>
              <a href="#how" style={footerLink}>How it Works</a>
              <a href="#token" style={footerLink}>CATR</a>
              <Link href="/" style={footerLink}>← HNDA</Link>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>© 2026 HNDA · Built on Base</p>
          </div>
        </div>
      </footer>

    </div>
  )
}

const navLink: React.CSSProperties = { color: "var(--muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }
const btnPrimary: React.CSSProperties = { background: "var(--accent)", color: "#fff", padding: "0.75rem 1.75rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none", fontSize: "1rem", display: "inline-block" }
const btnOutline: React.CSSProperties = { border: "1.5px solid var(--border)", color: "var(--text)", padding: "0.75rem 1.75rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none", fontSize: "1rem", display: "inline-block" }
const section: React.CSSProperties = { padding: "5rem 2rem" }
const sectionInner: React.CSSProperties = { maxWidth: "960px", margin: "0 auto" }
const label: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--accent)", marginBottom: "0.75rem" }
const h2: React.CSSProperties = { fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--text)" }
const card: React.CSSProperties = { background: "var(--card-bg)", border: "1.5px solid var(--border)", borderRadius: "16px", padding: "2rem" }
const footerLink: React.CSSProperties = { color: "var(--muted)", textDecoration: "none", fontSize: "0.9rem" }
