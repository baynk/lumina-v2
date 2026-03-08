# Lumina v3 Redesign — Project Tracker

**Branch:** `redesign/v3-overhaul`
**Master Brief:** `~/.openclaw/workspace/artifacts/lumina-redesign-master-brief.md`
**Started:** March 8, 2026

---

## Phase 1: Foundation (Week 1)

### Design Tokens & CSS
- [ ] Update `tailwind.config.ts` with warm palette
- [ ] Update `globals.css` with new color variables + atmospheric orbs
- [ ] Swap fonts: Cormorant Garamond + Inter (drop DM Serif Display)
- [ ] Update `layout.tsx` font imports

### Assets
- [ ] Generate 12 zodiac icons (Imagen 3 → SVG trace)
  - [ ] Aries
  - [ ] Taurus
  - [ ] Gemini
  - [ ] Cancer
  - [ ] Leo
  - [ ] Virgo
  - [ ] Libra
  - [ ] Scorpio
  - [ ] Sagittarius
  - [ ] Capricorn
  - [ ] Aquarius
  - [ ] Pisces
- [ ] Generate 8 moon phase images
- [ ] Generate 3 onboarding illustrations
- [ ] Create lumina✦ wordmark SVG

### Components
- [ ] New `<BottomNav>` (5 tabs, Lucide icons, gold active state)
- [ ] New `<ScrollWheelPicker>` for onboarding

---

## Phase 2: Core Screens (Week 2)

### Screen 1: Landing
- [ ] New hero with celestial background
- [ ] lumina✦ wordmark centered
- [ ] Single CTA button
- [ ] Language selector

### Screen 2: Onboarding
- [ ] Birth date scroll picker
- [ ] Birth time scroll picker
- [ ] Birth place search
- [ ] Feature reveal screens (3)
- [ ] "Analyzing" loading screen
- [ ] Chart reveal moment

### Screen 3: Home / Today
- [ ] Moon phase hero (120px, realistic)
- [ ] Transit alert cards
- [ ] Daily forecast card (from pipeline)
- [ ] Quick access grid

---

## Phase 3: Feature Screens (Week 3)

### Screen 4: Birth Chart
- [ ] Interactive natal wheel SVG
- [ ] Big Three horizontal scroll cards
- [ ] Planet placements grid

### Screen 6: Calendar
- [ ] Moon phase icons per day cell
- [ ] Day detail panel
- [ ] Retrograde indicators

---

## Phase 4: Polish (Week 4)

### Remaining Screens
- [ ] Screen 5: Compatibility visual overhaul
- [ ] Screen 7: Journal visual overhaul
- [ ] Screen 8: Consultation visual overhaul
- [ ] Screen 9: Profile visual overhaul
- [ ] Screen 10: Planet detail visual overhaul

### Animations
- [ ] Moon glow pulse
- [ ] Constellation background drift
- [ ] Card fade-in-up entrances
- [ ] Natal wheel draw animation
- [ ] Star twinkle

### QA
- [ ] Mobile responsive (iPhone, Android)
- [ ] Cross-browser (Chrome, Safari, Firefox)
- [ ] Russian text / Cyrillic rendering
- [ ] Performance audit

---

## Design Decisions Log

| Date | Decision | Source |
|------|----------|--------|
| Mar 8 | Warm palette: `#0E0D14` base, `#1A1822` cards | Ryan + multi-model critique |
| Mar 8 | Two fonts only: Cormorant + Inter | AI Studio critique, Ryan agreed |
| Mar 8 | Standard Lucide nav icons, no astrological symbols in nav | AI Studio critique, Ryan agreed |
| Mar 8 | No glassmorphism / backdrop-filter | Ava recommendation, Ryan agreed |
| Mar 8 | Teal + rose ONLY in chart/transit data, never UI chrome | Multi-model agreement |
| Mar 8 | Moonly Behance is the benchmark, not their live site | Ryan directive |
| Mar 8 | Zodiac icons: geometric line art, sacred geometry, gold SVG | All models agreed |
| Mar 8 | Atmospheric depth via blurred orbs, not flat gradients | Gemini critique |
