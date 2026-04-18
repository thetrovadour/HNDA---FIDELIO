"use client"

import Link from "next/link"
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button"

export default function FidelioPage() {
  return (
    <div style={{ background: "#f8fafc", color: "#0a0f14", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "64px",
        background: "rgba(248,250,252,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>← HNDA</Link>
        <div style={{ display: "flex", gap: "1.75rem", alignItems: "center" }}>
          <a href="#actors" style={navLink}>Network</a>
          <a href="#how" style={navLink}>How it Works</a>
          <a href="#token" style={navLink}>CATR</a>
          <a href="#contact" style={{ ...navLink, background: "#0ea5e9", color: "#fff", padding: "0.4rem 1rem", borderRadius: "999px", fontWeight: 600 }}>Join Network</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 2rem 4rem", textAlign: "center" }}>

        {/* Animated FIDELIO mark */}
        <div style={{ marginBottom: "2rem" }}>
          <svg viewBox="-58 -65 116 130" width="80" height="80" xmlns="http://www.w3.org/2000/svg" aria-label="FIDELIO mark">
            <defs>
              <linearGradient id="mark-grad" x1="0" y1="-55" x2="0" y2="55" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#c8a84b"/>
                <stop offset="52%" stopColor="#d9bc6e"/>
                <stop offset="100%" stopColor="#0ea5e9"/>
              </linearGradient>
            </defs>
            <path d="M -13,-42.5 L 0,-50 L 13,-42.5 M 30.3,-32.5 L 43.3,-25 L 43.3,-10 M 43.3,10 L 43.3,25 L 30.3,32.5 M 13,42.5 L 0,50 L -13,42.5 M -30.3,32.5 L -43.3,25 L -43.3,10 M -43.3,-10 L -43.3,-25 L -30.3,-32.5"
                  fill="none" stroke="url(#mark-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          <span style={{ fontSize: "0.85rem", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Live on Base · Testnet Active</span>
        </div>

        <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: "1.5rem" }}>
          Honduras pays<br /><span style={{ color: "#0ea5e9" }}>on its own terms.</span>
        </h1>

        <p style={{ fontSize: "1.1rem", color: "#64748b", maxWidth: "560px", lineHeight: 1.7, marginBottom: "2.5rem" }}>
          <strong style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>FIDELIO</strong> is a{" "}
          <span style={{ color: "#0ea5e9", fontWeight: 600 }}>closed-loop loyalty network</span>{" "}
          built for Honduran merchants and clients — backed by CATR, a token on Base that moves with every transaction.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <InteractiveHoverButton
            onClick={() => document.getElementById("actors")?.scrollIntoView({ behavior: "smooth" })}
            style={{ background: "#0ea5e9", color: "#fff", borderColor: "#0ea5e9", fontSize: "1rem", height: "48px" }}
            className="[--primary:#0ea5e9] [--primary-foreground:#fff]"
          >
            Explore the Network
          </InteractiveHoverButton>
          <a href="#how" style={btnOutline}>How it Works</a>
        </div>
      </section>

      <div style={divider} />

      {/* ── Actors ── */}
      <section id="actors" style={section}>
        <div style={sectionInner}>
          <div style={{ marginBottom: "3rem" }}>
            <p style={label}>Three pillars</p>
            <h2 style={h2}>One network. Three roles.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              {
                icon: "🧑", role: "For Clients", title: "Earn as you pay.",
                desc: "Every purchase with FIDELIO earns CATR — a token that lives in your wallet and grows with your loyalty to the network.",
                perks: ["Instant CATR rewards on every transaction", "Milestone bonuses at 5, 10, and 25 purchases", "Cross-merchant bonus when you explore the network", "No crypto knowledge required — H-Wallet included"],
                accent: "#0ea5e9",
              },
              {
                icon: "🏪", role: "For Merchants", title: "Redeem on your terms.",
                desc: "Accept CATR, build a loyal customer base, and redeem tokens directly to Lempiras — a transparent, on-chain settlement you can verify yourself.",
                perks: ["Accept CATR payments from any network client", "Redeem CATR → Lempiras at any time", "Transparent on-chain settlement — no black boxes", "Earn GCA — your stake in the HNDA network"],
                accent: "#c8a84b",
              },
              {
                icon: "🏦", role: "HNDA Treasury", title: "The network operator.",
                desc: "HNDA backs every CATR mint with real Lempiras, maintains the VaultOp (Gnosis Safe), and distributes rewards — a sovereign financial layer for Honduras.",
                perks: ["3.6% commission on every CATR transfer", "65% to treasury · 35% to reward pool", "High-value redemptions secured by 2-of-2 multisig", "Long-term: self-hosted Base node on Honduran hardware"],
                accent: "#6366f1",
              },
            ].map((a) => (
              <div key={a.role} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "2rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{a.icon}</div>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: a.accent, marginBottom: "0.5rem" }}>{a.role}</p>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.75rem" }}>{a.title}</h3>
                <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>{a.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {a.perks.map((p) => (
                    <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.88rem", color: "#475569" }}>
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

      <div style={divider} />

      {/* ── How it Works ── */}
      <section id="how" style={section}>
        <div style={sectionInner}>
          <div style={{ marginBottom: "3rem" }}>
            <p style={label}>The payment loop</p>
            <h2 style={h2}>Mint before pay.<br />Burn before redeem.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
            {[
              { num: "01", tag: "Client", title: "Generate reference", desc: "Client enters an amount in the app. FIDELIO generates a unique reference code tied to their wallet." },
              { num: "02", tag: "Bank", title: "Transfer Lempiras", desc: "Client transfers Lempiras to HNDA's Atlántida account with the reference code in the memo." },
              { num: "03", tag: "MerL1nk", title: "Detect & mint CATR", desc: "MerL1nk reads the bank notification, validates the reference, and mints CATR to the client's wallet on Base." },
              { num: "04", tag: "Merchant", title: "Spend & redeem", desc: "Client spends CATR at a merchant. Merchant burns CATR and receives Lempiras from HNDA treasury." },
            ].map((s) => (
              <div key={s.num} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.75rem" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#e2e8f0", lineHeight: 1, marginBottom: "0.5rem" }}>{s.num}</div>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0ea5e9", marginBottom: "0.5rem" }}>{s.tag}</p>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{s.title}</h4>
                <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "#0a0f14", color: "#fff", borderRadius: "16px", padding: "2rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0ea5e9", marginBottom: "0.75rem" }}>Non-negotiable invariants</p>
            <p style={{ color: "#cbd5e1", lineHeight: 1.8, fontSize: "0.95rem" }}>
              <strong style={{ color: "#fff" }}>MINT-BEFORE-PAY</strong> — CATR is only created after payment is confirmed on-chain.{" "}
              <strong style={{ color: "#fff" }}>BURN-BEFORE-REDEEM</strong> — Lempiras are only released after CATR is destroyed.
              These rules are hardcoded in the smart contract and enforced at every layer.
            </p>
          </div>
        </div>
      </section>

      <div style={divider} />

      {/* ── Token Stats ── */}
      <section id="token" style={section}>
        <div style={sectionInner}>
          <div style={{ marginBottom: "3rem" }}>
            <p style={label}>CATR Token · Base (Ethereum L2)</p>
            <h2 style={h2}>Designed to stay honest.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            {[
              { val: "50M", sub: "Supply cap", detail: "Revolving closed loop" },
              { val: "3.6%", sub: "Commission per transfer", detail: "65% treasury · 35% rewards" },
              { val: "2/2", sub: "Multisig (VaultOp)", detail: "High-value redemptions" },
              { val: "L2", sub: "Built on Base", detail: "Low fees, Ethereum security" },
            ].map((s) => (
              <div key={s.sub} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#0a0f14", marginBottom: "0.5rem" }}>{s.val}</div>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0a0f14", marginBottom: "0.25rem" }}>{s.sub}</p>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{s.detail}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {["Live on Base Sepolia Testnet", "CATRToken.sol · Verified", "1 CATR = 1 HNL"].map((b) => (
              <span key={b} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "999px", padding: "0.35rem 1rem", fontSize: "0.82rem", color: "#475569", fontWeight: 500 }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      <div style={divider} />

      {/* ── Sovereignty ── */}
      <section style={{ ...section, textAlign: "center" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <p style={label}>HNDA · Honduras Digital Assets</p>
          <blockquote style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 700, lineHeight: 1.5, color: "#0a0f14", fontStyle: "italic", margin: "0 0 1.5rem" }}>
            "The business of the Honduran people is{" "}
            <span style={{ color: "#0ea5e9" }}>Honduran people's business.</span>"
          </blockquote>
          <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: 1.8 }}>
            FIDELIO is built to minimize foreign entities in the critical path of a Honduran financial transaction — not as a reaction to threat, but as a statement of sovereignty. CATR is auditable, transparent, and honest because it lives on a public blockchain. Those guarantees don't exist in a database row.
          </p>
        </div>
      </section>

      <div style={divider} />

      {/* ── Contact / Footer ── */}
      <footer id="contact" style={{ padding: "3rem 2rem" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ ...h2, textAlign: "center", marginBottom: "1rem" }}>Ready to join the network?</h2>
            <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>Merchants, investors, developers — reach out.</p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="mailto:rodriguez.cjrp@outlook.com" style={btnPrimary}>Contact HNDA</a>
              <Link href="/" style={btnOutline}>← Back to HNDA</Link>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span style={{ fontWeight: 800, fontSize: "1rem" }}>FIDELIO <span style={{ fontWeight: 400, color: "#94a3b8" }}>by HNDA</span></span>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <a href="#actors" style={footerLink}>Network</a>
              <a href="#how" style={footerLink}>How it Works</a>
              <a href="#token" style={footerLink}>CATR</a>
              <Link href="/" style={footerLink}>← HNDA</Link>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>© 2026 HNDA · Built on Base</p>
          </div>
        </div>
      </footer>

    </div>
  )
}

const navLink: React.CSSProperties = { color: "#475569", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }
const btnPrimary: React.CSSProperties = { background: "#0ea5e9", color: "#fff", padding: "0.75rem 1.75rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none", fontSize: "1rem", display: "inline-block" }
const btnOutline: React.CSSProperties = { border: "1.5px solid #cbd5e1", color: "#0a0f14", padding: "0.75rem 1.75rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none", fontSize: "1rem", display: "inline-block" }
const divider: React.CSSProperties = { height: "1px", background: "#e2e8f0", margin: "0 2rem" }
const section: React.CSSProperties = { padding: "5rem 2rem" }
const sectionInner: React.CSSProperties = { maxWidth: "960px", margin: "0 auto" }
const label: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#0ea5e9", marginBottom: "0.75rem" }
const h2: React.CSSProperties = { fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "0", color: "#0a0f14" }
const footerLink: React.CSSProperties = { color: "#64748b", textDecoration: "none", fontSize: "0.9rem" }
