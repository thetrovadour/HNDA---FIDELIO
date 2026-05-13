"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { HexCanvasBackground } from "@/components/HexCanvasBackground"
import { useScrollReveal } from "@/hooks/useScrollReveal"
import { Android } from "@/components/ui/android"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { pilotLogin, merchantLogin } from "@/lib/api"


// ─── Login Panel (shared state, renders in nav on mobile / sidebar on desktop) ─

function useLoginPanel() {
  const router = useRouter()
  const [panel, setPanel] = useState<'client' | 'merchant' | null>(null)
  const [name, setName] = useState('')
  const [cred, setCred] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggle(p: 'client' | 'merchant') {
    setPanel(prev => prev === p ? null : p)
    setName(''); setCred(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !cred) return
    setLoading(true); setError('')
    try {
      if (panel === 'client') {
        const res = await pilotLogin({ full_name: name.trim(), credential: cred })
        localStorage.setItem('fidelio_session', JSON.stringify(res.data))
        router.push('/client')
      } else {
        const res = await merchantLogin({ full_name: name.trim(), credential: cred })
        localStorage.setItem('fidelio_merchant_session', JSON.stringify(res.data))
        router.push('/merchant')
      }
    } catch {
      setError('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return { panel, toggle, name, setName, cred, setCred, loading, error, handleSubmit }
}

const loginInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  background: '#111820', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '0.4rem', padding: '0.5rem 0.6rem',
  color: '#F1F5F9', fontSize: '0.75rem', outline: 'none',
  fontFamily: 'var(--font-body)',
}

function LoginForm({ panel, name, setName, cred, setCred, loading, error, handleSubmit }: {
  panel: 'client' | 'merchant'
  name: string; setName: (v: string) => void
  cred: string; setCred: (v: string) => void
  loading: boolean; error: string
  handleSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <input style={loginInput} placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)} required />
      <input style={loginInput} type="password" placeholder={panel === 'client' ? 'Contraseña o PIN' : 'Contraseña'} value={cred} onChange={e => setCred(e.target.value)} required />
      {error && <p style={{ fontSize: '0.68rem', color: '#EF4444', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.5rem', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '0.4rem', color: '#C9A84C', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      <p style={{ fontSize: '0.68rem', color: '#64748B', textAlign: 'center' as const, margin: 0 }}>
        {panel === 'client' ? (
          <>¿No tienes cuenta?{' '}<Link href="/register" style={{ color: '#C9A84C', textDecoration: 'none' }}>Regístrate</Link></>
        ) : (
          <>¿Eres comercio?{' '}<Link href="/apply" style={{ color: '#C9A84C', textDecoration: 'none' }}>Aplica aquí</Link></>
        )}
      </p>
    </form>
  )
}

// Desktop sidebar (hidden on mobile)
function LoginSidebar(props: ReturnType<typeof useLoginPanel>) {
  const { panel, toggle, ...formProps } = props
  const navBtn = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '0.55rem 0.9rem',
    background: active ? 'rgba(201,168,76,0.12)' : 'rgba(12,16,24,0.92)',
    border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.09)'}`,
    borderRadius: '0.5rem', color: active ? '#C9A84C' : '#94A3B8',
    fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.06em',
    cursor: 'pointer', textAlign: 'left' as const,
    backdropFilter: 'blur(10px)', transition: 'all 0.15s',
  })
  return (
    <div className="hidden md:flex" style={{ position: 'fixed', top: '80px', right: '1rem', zIndex: 200, width: '240px', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-body)' }}>
      <button style={navBtn(panel === 'client')} onClick={() => toggle('client')}>
        {panel === 'client' ? '▾' : '▸'} Soy Cliente
      </button>
      {panel === 'client' && (
        <div style={{ background: 'rgba(12,16,24,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.5rem', padding: '0.875rem', backdropFilter: 'blur(10px)' }}>
          <LoginForm panel="client" {...formProps} />
        </div>
      )}
      <button style={navBtn(panel === 'merchant')} onClick={() => toggle('merchant')}>
        {panel === 'merchant' ? '▾' : '▸'} Soy Comercio
      </button>
      {panel === 'merchant' && (
        <div style={{ background: 'rgba(12,16,24,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.5rem', padding: '0.875rem', backdropFilter: 'blur(10px)' }}>
          <LoginForm panel="merchant" {...formProps} />
        </div>
      )}
    </div>
  )
}

// Mobile nav buttons + dropdown panel (hidden on desktop)
function MobileLoginNav(props: ReturnType<typeof useLoginPanel>) {
  const { panel, toggle, ...formProps } = props
  const activeBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.65rem',
    background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
    border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.15)'}`,
    borderRadius: '0.4rem', color: active ? '#C9A84C' : '#94A3B8',
    fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.04em',
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  })
  return (
    <>
      {/* Buttons in nav — rendered via portal into nav, but simpler: just position fixed at nav level */}
      <div className="flex md:hidden" style={{ gap: '0.4rem', alignItems: 'center' }}>
        <button style={activeBtn(panel === 'client')} onClick={() => toggle('client')}>Cliente</button>
        <button style={activeBtn(panel === 'merchant')} onClick={() => toggle('merchant')}>Comercio</button>
      </div>
      {/* Dropdown panel below nav */}
      {panel && (
        <div className="block md:hidden" style={{ position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 190, background: 'rgba(10,15,20,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', padding: '1rem' }}>
          <LoginForm panel={panel} {...formProps} />
        </div>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FidelioPage() {
  useScrollReveal()
  const clipRef = useRef<SVGRectElement>(null)
  const loginPanel = useLoginPanel()

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
     
      <HexCanvasBackground />
      <LoginSidebar {...loginPanel} />

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1.25rem", height: "64px",
        background: "rgba(10,15,20,0.88)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        animation: "fadeIn 0.6s ease-out both",
      }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        <Link href="/" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, flexShrink: 0 }}>← HNDA</Link>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <a href="#actors" style={navLink} className="hidden md:inline">Network</a>
          <a href="#how" style={navLink} className="hidden md:inline">How it Works</a>
          <a href="#token" style={navLink} className="hidden md:inline">CATR</a>
          <MobileLoginNav {...loginPanel} />
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 2rem 4rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%" }} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-16">

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
              built for Honduran merchants and clients — powered by CATR, a token on Base that moves with every transaction. FIDELIO offers the power to create transaction requests through any device that supports it in a secure network. 
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
          <div className="hero-seq-item hidden lg:flex" style={{ justifyContent: "center", alignItems: "center" }}>
            <Android width={380} height={712} style={{ filter: "drop-shadow(0 32px 64px rgba(0,0,0,0.7)) drop-shadow(0 8px 24px rgba(14,165,233,0.15))" }}>
              <div style={{ width: "100%", height: "100%", background: "#06080D", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", fontSize: "13px", color: "#F1F5F9", position: "relative" }}>
                {/* Status bar */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px 4px", fontSize: "10px", color: "#64748B" }}>
                  <span>9:41</span><span>▲ ◼ 100%</span>
                </div>
                {/* Top bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <div style={{ fontSize: "8px", color: "#64748B", letterSpacing: "0.2em", textTransform: "uppercase" }}>FIDELIO</div>
                    <div style={{ fontSize: "13px", fontWeight: 300, color: "#F1F5F9", letterSpacing: "0.04em" }}>Bienvenido</div>
                  </div>
                  <div style={{ fontSize: "10px", color: "#C9A84C", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", padding: "2px 8px", borderRadius: "999px" }}>Usuario</div>
                </div>
                {/* Balance card */}
                <div style={{ margin: "12px 12px 0", background: "#0C1018", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "12px", padding: "14px" }}>
                  <div style={{ fontSize: "9px", color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Balance CATR</div>
                  <div style={{ fontSize: "26px", fontWeight: 700, color: "#C9A84C", letterSpacing: "-0.02em", lineHeight: 1 }}>56,203.19</div>
                  <div style={{ fontSize: "9px", color: "#64748B", marginTop: "4px" }}>≈ L. 56,203.19HNL</div>
                  <div style={{ marginTop: "10px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "8px", padding: "7px", textAlign: "center", fontSize: "10px", color: "#C9A84C", fontWeight: 500, letterSpacing: "0.06em" }}>
                    VER REDES
                  </div>
                </div>
                {/* Transactions */}
                <div style={{ margin: "12px 12px 0", flex: 1 }}>
                  <div style={{ fontSize: "9px", color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Actividad Reciente</div>
                  {[
                    { name: "Usuario 1", amount: "-85.00", time: "Hoy 14:32", color: "#EF4444" },
                    { name: "Bono CATR",  amount: "+500.00", time: "Hoy 11:15", color: "#10B981" },
                    { name: "Usuario 2", amount: "-120.00", time: "Ayer",       color: "#EF4444" },
                  ].map((tx, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "#F1F5F9" }}>{tx.name}</div>
                        <div style={{ fontSize: "9px", color: "#64748B", marginTop: "1px" }}>{tx.time}</div>
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: tx.color }}>{tx.amount} CATR</div>
                    </div>
                  ))}
                </div>
                {/* Bottom tab bar */}
                <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(6,8,13,0.96)", padding: "6px 0" }}>
                  {[
                    { label: "Inicio", active: true },
                    { label: "Red",    active: false },
                    { label: "Actividad", active: false },
                    { label: "Ajustes",   active: false },
                  ].map((tab) => (
                    <div key={tab.label} style={{ flex: 1, textAlign: "center", fontSize: "9px", fontWeight: tab.active ? 500 : 300, color: tab.active ? "#C9A84C" : "#64748B", letterSpacing: "0.06em", padding: "2px 0" }}>
                      {tab.label}
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
                icon: "🆔", role: "For Clients", title: "Earn as you pay.", accent: "var(--accent)",
                desc: "Every purchase with FIDELIO earns CATR — a token that lives in your wallet and accumulates with your loyalty to the network.",
                perks: ["Instant CATR rewards on every transaction", "Milestone bonuses at 5, 10, and 25 purchases", "Cross-merchant bonus when you explore the network", "No requirements. FIDELIO provides you the resources you need."],
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
              { num: "01", tag: "Client",   title: "Generate reference", desc: "A transaction request is generated at NFC level. FIDELIO generates a unique reference code tied to their wallet." },
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
              <a href="/register" style={{ textDecoration: "none" }}>
                <InteractiveHoverButton className="border-[var(--accent)] text-[var(--text)] bg-[var(--bg)]">Join Network</InteractiveHoverButton>
              </a>
              <Link href="/" style={{ textDecoration: "none" }}>
                <InteractiveHoverButton className="border-[var(--border)] text-[var(--text)] bg-[var(--bg)]">Back to HNDA</InteractiveHoverButton>
              </Link>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span className="stencil" style={{ fontWeight: 800, fontSize: "1rem" }}>FIDELIO <span style={{ fontWeight: 400, color: "var(--muted)", fontFamily: "var(--font-body)" }}>by HNDA</span></span>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <a href="#actors" style={footerLink}>Network</a>
              <a href="#how" style={footerLink}>How it Works</a>
              <a href="#token" style={footerLink}>CATR</a>
              <Link href="/" style={footerLink}>HNDA</Link>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>© 2026 HNDA · Built on Base</p>
          </div>
        </div>
      </footer>

    </div>
  )
}

const navLink: React.CSSProperties = { color: "var(--muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }
const section: React.CSSProperties = { padding: "5rem 2rem" }
const sectionInner: React.CSSProperties = { maxWidth: "960px", margin: "0 auto" }
const label: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--accent)", marginBottom: "0.75rem" }
const h2: React.CSSProperties = { fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--text)" }
const card: React.CSSProperties = { background: "var(--card-bg)", border: "1.5px solid var(--border)", borderRadius: "16px", padding: "2rem" }
const footerLink: React.CSSProperties = { color: "var(--muted)", textDecoration: "none", fontSize: "0.9rem" }
