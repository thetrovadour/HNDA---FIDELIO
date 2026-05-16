"use client"

import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { CanvasBackground } from "@/components/CanvasBackground"
import { useScrollReveal } from "@/hooks/useScrollReveal"
import { TypingAnimation } from "@/components/magicui/typing-animation"
import { HyperText } from "@/components/ui/hyper-text"
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"


export default function HndaHome() {
  useScrollReveal()
  const [logoRotated, setLogoRotated] = useState(false)
  const wasAtTop = useRef(true)

  useEffect(() => {
    const items = document.querySelectorAll(".hero-seq-item")
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), 200 + i * 150)
    })
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const atTop = window.scrollY === 0
      if (!atTop && wasAtTop.current) setLogoRotated(true)
      if (atTop) { setLogoRotated(false); wasAtTop.current = true }
      else wasAtTop.current = false
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", fontFamily: "var(--font-body)", position: "relative" }}>
      <CanvasBackground />
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        maskImage: "radial-gradient(ellipse 110% 110% at 50% 30%, black 60%, transparent 95%)",
        WebkitMaskImage: "radial-gradient(ellipse 110% 110% at 50% 30%, black 60%, transparent 95%)",
      }}>
        <InteractiveGridPattern
          squares={[40, 40]}
          className="opacity-40"
          squaresClassName="hover:fill-sky-400/20"
        />
        <div style={{
          position: "absolute", inset: 0,
          backdropFilter: "blur(16px)",
          maskImage: "radial-gradient(ellipse 110% 110% at 50% 30%, transparent 60%, black 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 110% 110% at 50% 30%, transparent 60%, black 95%)",
        }} />
      </div>


      {/* ── Nav ── */} 
      <nav className="justify-center md:justify-between" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center",
        padding: "0 2rem", height: "64px",
        background: "rgba(10,15,20,0.55)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        animation: "fadeIn 0.8s ease-out both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
        <a href="#hero" style={{ display: "flex", alignItems: "center", textDecoration: "none" }} className="shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 300 300" style={{ transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)", transform: logoRotated ? "rotate(180deg)" : "rotate(0deg)" }}>
            <defs>
              <linearGradient id="logo-shimmer" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="45%" stopColor="white" stopOpacity="0" />
                <stop offset="50%" stopColor="white" stopOpacity="0.55" />
                <stop offset="55%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <clipPath id="logo-clip">
                <rect width="300" height="300" />
              </clipPath>
            </defs>
            {/* Outer ring */}
            <g transform="matrix(0.1115 0 0 0.1115 150 150)">
              <path fill="rgb(234, 234, 234)" transform="translate(-512,-512)" d="M 844.1 211.4 C 840.5 207.4 836.8 203.5 833.1 199.7 C 779.3 144.3 711.2 102.8 634.9 81 C 619.8 76.7 604.4 73.2 588.7 70.5 C 563.7 66.2 538.1 64 512 64 C 386 64 272.1 116 190.7 199.8 C 187 203.6 183.3 207.5 179.7 211.5 C 107.8 290.9 64 396.4 64 512 C 64 627.6 107.8 732.9 179.6 812.4 C 183.2 816.4 186.8 820.3 190.6 824.1 C 244.5 879.6 312.7 921.2 389.2 943 C 404.3 947.3 419.7 950.8 435.4 953.5 C 460.3 957.8 485.9 960 512 960 C 538.1 960 563.7 957.8 588.7 953.5 C 604.4 950.8 619.8 947.3 634.9 943 C 711.4 921.3 779.5 879.7 833.4 824.2 C 837.1 820.3 840.8 816.5 844.4 812.5 C 916.2 733 960 627.6 960 512 C 960 396.3 916.1 290.9 844.1 211.4 Z M 915.9 520.2 C 914.9 571.9 904.3 622 884.3 669.3 C 866.9 710.5 843 748.1 813.2 781.3 C 809.7 785.3 806 789.2 802.3 793 C 800.8 794.6 799.2 796.1 797.7 797.7 C 760.6 834.8 717.4 864 669.3 884.3 C 633.5 899.4 596.2 909.2 557.7 913.5 C 545.2 914.9 532.7 915.7 520 915.9 C 517.4 916 514.7 916 512 916 C 509.3 916 506.7 916 504 915.9 C 491.4 915.7 478.8 914.9 466.3 913.5 C 427.9 909.2 390.5 899.4 354.7 884.3 C 306.6 863.9 263.4 834.8 226.3 797.7 C 224.7 796.1 223.1 794.5 221.6 792.9 C 217.9 789.1 214.2 785.1 210.7 781.2 C 180.9 748 157.1 710.4 139.7 669.3 C 119.7 622 109.1 571.9 108.1 520.2 L 217.4 520.2 C 217.4 517.5 217.3 514.8 217.3 512 C 217.3 509.4 217.3 506.8 217.4 504.2 L 108.1 504.2 C 109.1 452.4 119.7 402.2 139.8 354.8 C 157.2 313.6 181.1 275.9 211 242.7 C 214.5 238.7 218.2 234.8 221.9 231 C 223.4 229.5 224.9 227.9 226.4 226.4 C 263.5 189.3 306.7 160.1 354.8 139.8 C 390.6 124.7 427.9 114.9 466.4 110.6 C 478.9 109.2 491.4 108.4 504.1 108.1 C 506.8 108 509.4 108 512.1 108 C 514.8 108 517.4 108 520.1 108.1 C 532.8 108.3 545.3 109.2 557.8 110.6 C 596.2 114.9 633.6 124.7 669.3 139.8 C 717.4 160.1 760.6 189.3 797.7 226.4 C 799.2 227.9 800.7 229.4 802.1 230.9 C 805.8 234.7 809.5 238.6 813 242.6 C 842.9 275.9 866.8 313.5 884.3 354.8 C 904.3 402.2 915 452.4 915.9 504.2 L 806.6 504.2 C 806.6 506.8 806.7 509.4 806.7 512 C 806.7 514.7 806.7 517.4 806.6 520.2 L 915.9 520.2 Z" />
            </g>
            {/* Cross */}
            <g transform="matrix(0.1115 0 0 0.1115 150 150)">
              <path fill="rgb(57,57,58)" transform="translate(-512,-512)" d="M 790.7 512 C 790.7 514.7 790.7 517.4 790.6 520.2 L 520 520.2 L 520 664.9 C 517.3 664.8 514.6 664.8 511.9 664.8 C 509.3 664.8 506.6 664.8 504 664.9 L 504 520.2 L 233.4 520.2 C 233.3 517.5 233.3 514.8 233.3 512 C 233.3 509.4 233.3 506.8 233.4 504.2 L 504 504.2 L 504 358.8 C 506.6 358.8 509.3 358.9 511.9 358.9 C 514.6 358.9 517.3 358.9 520 358.8 L 520 504.2 L 790.6 504.2 C 790.6 506.8 790.7 509.4 790.7 512 Z M 520 111.1 L 520 342.7 C 517.3 342.8 514.6 342.8 511.9 342.8 C 509.3 342.8 506.6 342.8 504 342.7 L 504 111.1 C 506.7 110 509.3 109 512 108 C 514.7 109 517.3 110.1 520 111.1 Z M 512 916 Z M 520 680.9 L 520 912.9 C 517.3 914 514.7 915 512 916 C 509.3 915 506.7 913.9 504 912.9 L 504 680.9 C 506.6 680.8 509.3 680.8 511.9 680.8 C 514.6 680.8 517.3 680.8 520 680.9 Z" />
            </g>
            {/* Orbital rings */}
            <g transform="matrix(0.1115 0 0 0.1115 150 150)">
              <path fill="rgb(14,165,233)" transform="translate(-511.9,-512.05)" d="M 512 916 Z M 748.7 732.5 C 784.3 669.6 805.2 597.3 806.5 520.2 C 806.5 517.5 806.6 514.8 806.6 512 C 806.6 509.4 806.6 506.8 806.5 504.2 C 805.2 426.9 784.3 354.3 748.5 291.3 C 771.5 277 793 260.7 812.9 242.6 C 809.3 238.6 805.7 234.7 802 230.9 C 782.8 248.4 762.2 264 740.3 277.6 C 696.4 206.2 633 148.1 557.5 110.6 C 545 109.2 532.5 108.4 519.8 108.1 C 517.1 108 514.5 108 511.8 108 C 514.5 109 517.1 110.1 519.8 111.1 C 522.1 112 524.3 113 526.6 113.9 C 578 135.7 624.2 166.8 663.9 206.5 C 688 230.6 708.9 257.1 726.6 285.7 C 711.6 294.3 696 302.1 679.9 308.9 C 629.1 330.4 575.3 341.8 519.9 342.8 C 517.2 342.9 514.5 342.9 511.8 342.9 C 509.2 342.9 506.5 342.9 503.9 342.8 C 448.4 341.8 394.5 330.4 343.6 308.9 C 327.6 302.1 312 294.4 297 285.8 C 314.6 257.2 335.6 230.6 359.7 206.5 C 399.4 166.8 445.6 135.7 497 113.9 C 499.3 113 501.5 112 503.8 111.1 C 506.5 110 509.1 109 511.8 108 C 509.1 108 506.5 108 503.8 108.1 C 491.1 108.3 478.6 109.2 466.1 110.6 C 390.6 148.1 327.2 206.2 283.3 277.7 C 261.4 264.1 240.8 248.5 221.6 231 C 217.9 234.8 214.2 238.8 210.7 242.7 C 230.6 260.8 252.2 277.1 275.2 291.4 C 239.5 354.4 218.6 426.9 217.3 504.2 C 217.3 506.8 217.2 509.4 217.2 512 C 217.2 514.7 217.2 517.4 217.3 520.2 C 218.7 597.2 239.5 669.5 275.1 732.4 C 252.1 746.7 230.5 763.1 210.6 781.2 C 214.1 785.2 217.8 789.1 221.5 792.9 C 240.7 775.4 261.3 759.8 283.2 746.1 C 327.1 817.7 390.6 875.9 466.2 913.5 C 478.7 914.9 491.2 915.7 503.9 915.9 C 506.6 916 509.2 916 511.9 916 C 509.2 915 506.6 913.9 503.9 912.9 C 501.6 912 499.4 911 497.1 910.1 C 445.7 888.3 399.5 857.2 359.8 817.5 C 335.6 793.3 314.6 766.7 297 738 C 312 729.4 327.6 721.6 343.7 714.8 C 394.5 693.3 448.4 681.9 504 680.9 C 506.6 680.8 509.3 680.8 511.9 680.8 C 514.6 680.8 517.3 680.8 520 680.9 C 575.5 681.9 629.3 693.3 680 714.8 C 696.2 721.6 711.8 729.4 726.9 738.1 C 709.3 766.8 688.3 793.4 664.1 817.6 C 624.4 857.3 578.2 888.4 526.8 910.2 C 524.5 911.2 522.3 912.1 520 913 C 517.3 914.1 514.7 915.1 512 916.1 C 514.7 916.1 517.3 916.1 520 916 C 532.7 915.8 545.2 915 557.7 913.6 C 633.3 876.1 696.7 817.9 740.6 746.3 C 762.4 759.9 783.1 775.6 802.3 793.1 C 806 789.3 809.6 785.4 813.2 781.4 C 793.3 763.1 771.7 746.8 748.7 732.5 Z M 520 664.9 C 517.3 664.8 514.6 664.8 511.9 664.8 C 509.3 664.8 506.6 664.8 504 664.9 C 425.8 666.3 352.5 687.7 288.9 724.2 C 280.9 710 273.7 695.3 267.3 680.2 C 245.8 629.4 234.4 575.7 233.4 520.2 C 233.3 517.5 233.3 514.8 233.3 512 C 233.3 509.4 233.3 506.8 233.4 504.2 C 234.4 448.6 245.8 394.7 267.3 343.9 C 273.7 328.7 281 313.9 289.1 299.6 C 352.6 336.1 425.9 357.5 504 358.8 C 506.6 358.8 509.3 358.9 511.9 358.9 C 514.6 358.9 517.3 358.9 520 358.8 C 598.1 357.4 671.4 336 734.9 299.5 C 743 313.8 750.3 328.6 756.7 343.9 C 778.2 394.8 789.6 448.7 790.6 504.2 C 790.6 506.8 790.7 509.4 790.7 512 C 790.7 514.7 790.7 517.4 790.6 520.2 C 789.6 575.6 778.2 629.4 756.7 680.2 C 750.3 695.4 743.1 710.1 735 724.3 C 671.5 687.7 598.2 666.3 520 664.9 Z" />
            </g>
            {/* Stars — white, symmetric */}
            {[{x:127.5,y:132.5},{x:172.5,y:132.5},{x:172.5,y:167.5},{x:127.5,y:167.5},{x:150,y:150}].map((s, i) => (
              <g key={i} transform={`matrix(0.1262 0 0 0.1327 ${s.x} ${s.y})`}>
                <polygon fill="rgb(255,255,255)" points="0,-67.8381 20.5725,-21.1537 71.3292,-16.0144 33.287,17.9775 44.0839,67.8381 0,42.1619 -44.0839,67.8381 -33.287,17.9775 -71.3292,-16.0144 -20.5725,-21.1537" />
              </g>
            ))}
            {/* Shimmer sweep */}
            <rect x="-300" y="0" width="300" height="300" fill="url(#logo-shimmer)" clipPath="url(#logo-clip)" style={{ mixBlendMode: "overlay" }}>
              <animateTransform attributeName="transform" type="translate" from="-300 0" to="600 0" dur="2.8s" repeatCount="indefinite" />
            </rect>
          </svg>
        </a>
          <a href="#mission" style={navLink} className="hidden md:inline">Mission</a>
          <a href="#products" style={navLink} className="hidden md:inline">Products</a>
          <a href="#contact" style={navLink} className="hidden md:inline">Contact</a>
        </div>
        <div style={{ gap: "0.75rem", alignItems: "center" }} className="hidden md:flex">
          <Link href="/nodes" style={ctaLink}>HNDA Nodes</Link>
          <Link href="/wallets" style={ctaLink}>
             H-<span style={{
              background: "linear-gradient(90deg, #fff 0%, #0ea5e9 40%, #fff 60%, #0ea5e9 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmerText 8s linear infinite",
            }}>Wallets</span>
          </Link>
          <style>{`@keyframes shimmerText { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }`}</style>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 2rem 4rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "760px", textAlign: "center" }}>

          <div className="hero-seq-item" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "2rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Honduras Nativa Digital Answers · San Pedro Sula</span>
          </div>
         <HyperText>
          HNDA
          </HyperText>
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
            <Link href="/fidelio" style={{ textDecoration: "none" }}>
              <InteractiveHoverButton className="border-[var(--accent)] text-[var(--text)] bg-[var(--bg)]">See FIDELIO</InteractiveHoverButton>
            </Link>
            <a href="#mission" style={{ textDecoration: "none" }}>
              <InteractiveHoverButton className="border-[var(--border)] text-[var(--text)] bg-[var(--bg)]">Our Mission</InteractiveHoverButton>
            </a>
          </div>

          <div className="hero-seq-item" style={{ marginTop: "4rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", animation: "scrollFade 2s ease-in-out infinite" }}>
            <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, transparent, var(--accent))" }} />
            <span>Scroll</span>
          </div>
          <style>{`@keyframes scrollFade { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

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
                <p style={{ color: "#e2e8f0", lineHeight: 1.7, fontSize: "0.95rem" }}>{m.body}</p>
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
              <p style={{ color: "#e2e8f0", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1rem" }}>A closed-loop loyalty and payment network for Honduran merchants and clients. 1 CATR = 1 HNL. Built on Base.</p>
              <span style={{ color: "var(--accent)", fontSize: "0.9rem", fontWeight: 600 }}>Explore FIDELIO →</span>
            </Link>

            <div style={{ ...card, opacity: 0.55 }} data-reveal data-delay="2">
              <span style={statusBadgeMuted}>Coming Soon</span>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔐</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>H-Wallet</h3>
              <p style={{ color: "#e2e8f0", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1rem" }}>Self-custody wallet infrastructure for Honduran users. No MetaMask required — HNDA generates and custodies keypairs locally.</p>
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>In Planning</span>
            </div>

            <div style={{ ...card, opacity: 0.55 }} data-reveal data-delay="3">
              <span style={statusBadgeMuted}>Coming Soon</span>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🌐</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>HNDA Node</h3>
              <p style={{ color: "#e2e8f0", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1rem" }}>A self-hosted Base node on Honduran hardware — eliminating Infura from the critical path of every FIDELIO transaction.</p>
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
            <Link href="/register" style={btnPrimary}>Join Network</Link>
            <a href="mailto:someone@someone.com" style={btnOutline}>Contact HNDA</a>
            <Link href="/fidelio" style={btnOutline}>See FIDELIO</Link>
          </div>
        </div>
      </section>

      <div className="h-divider" style={{ position: "relative", zIndex: 1 }} />

      {/* ── Footer ── */}
     <footer
  style={{
    padding: "2rem",
    position: "relative",
    zIndex: 1,
  }}
>
  <div
    style={{
      maxWidth: "960px",
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "1rem",
    }}
  >
    

    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
      <a href="#mission" style={{ fontFamily: "var(--font-body)", color: "var(--text)" }}>
        Mission
      </a>
      <a href="#products" style={{ fontFamily: "var(--font-body)", color: "var(--text)" }}>
        Products
      </a>
      <Link href="/fidelio" style={{ fontFamily: "var(--font-body)", color: "var(--text)" }}>
        FIDELIO
      </Link>
      <a href="#contact" style={{ fontFamily: "var(--font-body)", color: "var(--text)" }}>
        Contact
      </a>
    </div>

    <p style={{ color: "var(--muted)", fontSize: "0.85rem", fontFamily: "var(--font-body)" }}>
      © 2026 HNDA · San Pedro Sula, Honduras
    </p>
  </div>
</footer>


    </div>
  )
}

const navLink: React.CSSProperties = { color: "var(--muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }
const ctaLink: React.CSSProperties = { background: "var(--accent)", color: "#fff", padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 500, textDecoration: "none" }
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
