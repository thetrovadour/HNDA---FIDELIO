# Plan: FIDELIO Website (website/website.html)

## Context
The user needs a single-page website for HNDA's FIDELIO project. The file `website/website.html` exists but is empty. The website should present FIDELIO's services through CATR to potential users/merchants, based on the architecture document.

## Design Decisions

### Color Scheme
- **CATR sections**: Yellowish-orange palette (backgrounds, accents, buttons)
- **GCA sections**: Blue background with red and green accent colors
- **General**: Clean white/dark neutral for text and spacing

### Content Sections
1. **Hero / Header** — FIDELIO branding, tagline ("Digital Loyalty for Honduran Tourism"), HNDA logo area
2. **What is FIDELIO?** — The arcade analogy from the architecture doc, simplified
3. **CATR Services** (yellowish-orange theme) — What clients & merchants can do:
   - Buy CATR with Lempiras (bank transfer)
   - Pay merchants with CATR (QR scan)
   - Earn rewards (milestones, cross-merchant bonuses, referrals)
   - Merchant redemption (CATR → Lempiras through HNDA)
4. **GCA Section** (blue/red/green theme) — Brief intro to the growth participation token (coming in Etapa 2)
5. **How It Works** — Simple 4-step visual flow (Buy → Pay → Earn → Redeem)
6. **Reward System** — The 3 reward pools explained simply
7. **Footer** — HNDA branding, legal note (BCH compliance confirmed)

### Technical Approach
- **Single self-contained HTML file** with inline CSS and no external dependencies
- Responsive/mobile-first design
- Clean, modern layout using CSS Grid/Flexbox
- Smooth scroll navigation
- No JavaScript frameworks needed — vanilla JS for minor interactions only

## File to Modify
- `/home/cristian-rodriguez/proyectos/HNDA---FIDELIO/website/website.html`

## Verification
- Open `website.html` directly in a browser
- Check responsiveness at mobile (375px), tablet (768px), desktop (1200px) widths
- Verify CATR sections use yellowish-orange colors
- Verify GCA section uses blue background with red/green accents
- Confirm all FIDELIO services through CATR are described
