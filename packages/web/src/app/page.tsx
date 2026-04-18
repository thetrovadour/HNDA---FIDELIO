"use client"

import Link from "next/link"
import { useEffect } from "react"
import { CanvasBackground } from "@/components/CanvasBackground"
import { useScrollReveal } from "@/hooks/useScrollReveal"
import { TypingAnimation } from "@/components/magicui/typing-animation"

export default function HndaHome() {
  useScrollReveal()

  useEffect(() => {
    const items = document.querySelectorAll(".hero-seq-item")
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), 200 + i * 150)
    })
  }, [])

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", fontFamily: "var(--font-body)", position: "relative" }}>
      <CanvasBackground />

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "64px",
        background: "rgba(10,15,20,0.88)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <a href="#hero" style={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "var(--text)", textDecoration: "none", fontFamily: "var(--font-body)" }}>
          HNDA
        </a>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <a href="#mission" style={navLink}>Mission</a>
          <a href="#products" style={navLink}>Products</a>
          <a href="#contact" style={navLink}>Contact</a>
          <Link href="/fidelio" style={ctaLink}>FIDELIO →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 2rem 4rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "760px", textAlign: "center" }}>

          <div className="hero-seq-item" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "2rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Honduras Digital Assets · San Pedro Sula</span>
          </div>

          <h1 className="hero-seq-item" style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "1.5rem", color: "var(--text)" }}>
            HNDA
          </h1>

          <div className="hero-seq-item" style={{ fontSize: "clamp(1rem, 2.5vw, 1.35rem)", color: "var(--muted)", lineHeight: 1.6, marginBottom: "2.5rem", minHeight: "2.5em" }}>
            <TypingAnimation
              as="span"
              words={[
                "Sovereign digital infrastructure.",
                "Built for Honduras.",
                "Technology that belongs to the people.",
                "On-chain. Transparent. Honest.",
              ]}
              loop
              duration={60}
              pauseDelay={1800}
              className="text-[#0ea5e9] font-semibold"
            />
          </div>

          <p className="hero-seq-item" style={{ fontSize: "1.05rem", color: "var(--muted)", maxWidth: "540px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
            Building <span style={{ color: "var(--accent)", fontWeight: 600 }}>sovereign digital infrastructure</span> for Honduras —
            technology that belongs to the Honduran people, built on their terms.
          </p>

          <div className="hero-seq-item" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/fidelio" style={btnPrimary}>See FIDELIO</Link>
            <a href="#mission" style={btnOutline}>Our Mission</a>
          </div>

          <div className="hero-seq-item" style={{ marginTop: "4rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, transparent, var(--accent))" }} />
            <span>Scroll</span>
          </div>

        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Mission ── */}
      <section id="mission" style={{ ...section, position: "relative", zIndex: 1 }}>
        <div style={sectionInner}>
          <div style={{ marginBottom: "3rem" }} data-reveal>
            <p style={label}>Who we are</p>
            <h2 style={h2}>Honduras Nativa<br />Digital Answers.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            {[
              { icon: "🇭🇳", title: "Honduran by design", body: "HNDA builds for Honduras — not for a global market that happens to include Honduras. Every product decision is made through the lens of what works here, legally and culturally." },
              { icon: "🔗", title: "Blockchain as a trust layer", body: "We use public blockchains because they are auditable, transparent, and honest. Those guarantees don't exist in a database row. Technology should be accountable." },
              { icon: "🏛️", title: "Sovereignty as strategy", body: "Our long-term goal is to minimize foreign entities in the critical path of Honduran financial transactions — not as a threat response, but as a statement of principle." },
            ].map((m, i) => (
              <div key={m.title} style={card} data-reveal data-delay={String(i + 1)}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{m.icon}</div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text)" }}>{m.title}</h3>
                <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.95rem" }}>{m.body}</p>
              </div>
            ))}
          </div>

          <blockquote style={quote} data-reveal>
            "The business of the Honduran people is{" "}
            <span style={{ color: "var(--accent)" }}>Honduran people's business.</span>"
          </blockquote>
        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Products ── */}
      <section id="products" style={{ ...section, position: "relative", zIndex: 1 }}>
        <div style={sectionInner}>
          <div style={{ marginBottom: "3rem" }} data-reveal>
            <p style={label}>What we're building</p>
            <h2 style={h2}>The HNDA stack.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            <Link href="/fidelio" style={{ ...card, borderColor: "var(--accent)", textDecoration: "none", color: "inherit" }} data-reveal data-delay="1">
              <span style={{ ...statusBadge, background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>Live · Testnet</span>
              <div style={{ width: 48, height: 48, marginBottom: "1rem" }}>
                <svg viewBox="-58 -65 116 130" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M -13,-42.5 L 0,-50 L 13,-42.5 M 30.3,-32.5 L 43.3,-25 L 43.3,-10 M 43.3,10 L 43.3,25 L 30.3,32.5 M 13,42.5 L 0,50 L -13,42.5 M -30.3,32.5 L -43.3,25 L -43.3,10 M -43.3,-10 L -43.3,-25 L -30.3,-32.5"
                        fill="none" stroke="var(--gold)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="stencil" style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>FIDELIO</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1rem" }}>A closed-loop loyalty and payment network for Honduran merchants and clients. 1 CATR = 1 HNL. Built on Base.</p>
              <span style={{ color: "var(--accent)", fontSize: "0.9rem", fontWeight: 600 }}>Explore FIDELIO →</span>
            </Link>

            <div style={{ ...card, opacity: 0.55 }} data-reveal data-delay="2">
              <span style={statusBadgeMuted}>Coming Soon</span>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔐</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>H-Wallet</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1rem" }}>Self-custody wallet infrastructure for Honduran users. No MetaMask required — HNDA generates and custodies keypairs locally.</p>
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>In Planning</span>
            </div>

            <div style={{ ...card, opacity: 0.55 }} data-reveal data-delay="3">
              <span style={statusBadgeMuted}>Coming Soon</span>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🌐</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>HNDA Node</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1rem" }}>A self-hosted Base node on Honduran hardware — eliminating Infura from the critical path of every FIDELIO transaction.</p>
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>In Planning</span>
            </div>
          </div>
        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Contact ── */}
      <section id="contact" style={{ ...section, textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "4rem 2rem" }} data-reveal>
          <p style={label}>Get in touch</p>
          <h2 style={{ ...h2, textAlign: "center" }}>Want to join the network?</h2>
          <p style={{ color: "var(--muted)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: "2rem", marginTop: "1rem" }}>
            Whether you're a merchant, an investor, or a developer — reach out.
            HNDA is building Honduras's financial layer. There's a role for you.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:rodriguez.cjrp@outlook.com" style={btnPrimary}>Contact HNDA</a>
            <Link href="/fidelio" style={btnOutline}>See FIDELIO</Link>
          </div>
        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Footer ── */}
      <footer style={{ padding: "2rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>HNDA</span>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <a href="#mission" style={footerLink}>Mission</a>
            <a href="#products" style={footerLink}>Products</a>
            <Link href="/fidelio" style={footerLink}>FIDELIO</Link>
            <a href="#contact" style={footerLink}>Contact</a>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>© 2026 HNDA · San Pedro Sula, Honduras</p>
        </div>
      </footer>

    </div>
  )
}

const navLink: React.CSSProperties = { color: "var(--muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }
const ctaLink: React.CSSProperties = { background: "var(--accent)", color: "#fff", padding: "0.4rem 1rem", borderRadius: "999px", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }
const btnPrimary: React.CSSProperties = { background: "var(--accent)", color: "#fff", padding: "0.75rem 1.75rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none", fontSize: "1rem", display: "inline-block" }
const btnOutline: React.CSSProperties = { border: "1.5px solid var(--border)", color: "var(--text)", padding: "0.75rem 1.75rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none", fontSize: "1rem", display: "inline-block" }
const section: React.CSSProperties = { padding: "5rem 2rem" }
const sectionInner: React.CSSProperties = { maxWidth: "960px", margin: "0 auto" }
const label: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem" }
const h2: React.CSSProperties = { fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--text)" }
const card: React.CSSProperties = { background: "var(--card-bg)", border: "1.5px solid var(--border)", borderRadius: "16px", padding: "2rem" }
const statusBadge: React.CSSProperties = { display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, marginBottom: "1rem", letterSpacing: "0.04em" }
const statusBadgeMuted: React.CSSProperties = { ...statusBadge, background: "rgba(255,255,255,0.06)", color: "var(--muted)" }
const quote: React.CSSProperties = { fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)", fontStyle: "italic", color: "var(--text)", textAlign: "center", padding: "2rem", margin: 0, lineHeight: 1.6 }
const footerLink: React.CSSProperties = { color: "var(--muted)", textDecoration: "none", fontSize: "0.9rem" }
