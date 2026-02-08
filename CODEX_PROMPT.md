You are building Lumina V2 — a premium astrology web app for women (age 20-35). This is a Next.js 14 app with App Router, TypeScript, and Tailwind CSS. The project is already scaffolded with create-next-app.

EXISTING FILES (DO NOT MODIFY):
- lib/astronomyCalculator.ts — the core astronomy calculator using astronomy-engine. Exports: calculateNatalChart(birthData: BirthData) => NatalChartData, calculateDailyCelestialData() => DailyCelestialData
- lib/types.ts — TypeScript interfaces: BirthData, NatalChartData, DailyCelestialData, PlanetInfo, HouseInfo, AspectData, MoonData, SavedChart, UserProfile
- .env.local contains GEMINI_API_KEY=placeholder

INSTALLED DEPS: astronomy-engine, date-fns, date-fns-tz, @google/generative-ai

=== DESIGN SPEC ===

COLOR PALETTE:
- Primary background: Deep navy/midnight #0a0e27 to dark indigo #151a3d
- Secondary: Rich purple-black #1a1040
- Accent gold: Warm champagne #d4af37, #f4e4bc
- Accent rose: Soft rose/blush #e8b4b8, #d4a0a0
- Text: Warm white #f5f0eb, muted cream #c8bfb6
- Cards: Glass-morphism — frosted dark glass with subtle borders (backdrop-blur-md, bg-white/5, border border-white/10)
- Gradients: Subtle celestial gradients

TYPOGRAPHY:
- Headlines: Playfair Display (serif, elegant) — import from Google Fonts in layout.tsx using next/font/google
- Body: Inter (clean sans) — import from Google Fonts
- Light tracking for labels

VISUAL ELEMENTS:
- Subtle star field or constellation CSS background (use radial-gradient dots)
- Smooth CSS animations (fade-in on mount, gentle pulse for moon)
- Glass-morphism cards
- Gold/champagne accents for zodiac symbols and highlights
- Moon phase visualization (CSS-based crescent/circle)
- NO heavy illustrations, NO cartoon elements, NO cheap purple gradients
- Premium, mystical, dark aesthetic (like Co-Star meets Sanctuary)

=== PAGES TO BUILD ===

1. app/page.tsx — LANDING PAGE
- Full-screen celestial dark background with animated star field (CSS)
- Logo "Lumina" in Playfair Display, gold color, centered at top
- Tagline "Discover your celestial blueprint" or Russian equivalent
- Elegant birth data form with:
  - Name input (optional)
  - Date of birth (3 select dropdowns: day/month/year)
  - Time of birth (hour:minute selects, 24h format)
  - Birth location with search using OpenStreetMap Nominatim API (fetch to https://nominatim.openstreetmap.org/search?q=QUERY&format=json&limit=5)
  - Location shows lat/lng after selection
  - Timezone auto-detected from coordinates using Intl.DateTimeFormat
- "Discover Your Chart" CTA button — gold gradient, rounded, elegant
- Language toggle EN/RU in top-right corner
- On submit: store birth data in localStorage, redirect to /chart
- Mobile-first, full viewport height

2. app/chart/page.tsx — MAIN DASHBOARD (client component with "use client")
- Reads birth data from localStorage (redirect to / if missing)
- Calls calculateNatalChart and calculateDailyCelestialData on mount
- Sends data to /api/horoscope for AI-generated horoscope
- Layout sections (scrollable, mobile-first):
  - HERO: Big Three — Sun sign, Rising sign, Moon sign displayed prominently with zodiac Unicode symbols
  - DAILY HOROSCOPE: Glass card with AI-generated personalized horoscope, loading skeleton while fetching
  - MOON PHASE: Visual moon phase display using CSS circles with phase name and illumination percentage
  - PLANETARY POSITIONS: All 10 planets listed with sign, degrees, house number in a glass card grid
  - TRANSITS: Current planetary positions listed
  - KEY ASPECTS: Top 5 aspects with descriptions
- Navigation back to landing page
- Language toggle persisted

3. app/planet/[name]/page.tsx — PLANET DEEP DIVE (client component)
- Shows detailed AI explanation for a specific planet placement
- Fetches from /api/explain
- Beautiful single-card layout with planet name, sign, house
- Back button to chart

=== API ROUTES ===

4. app/api/horoscope/route.ts
- POST handler
- Accepts JSON body: { natalChart: NatalChartData, dailyData: DailyCelestialData, language: "en" | "ru" }
- Uses @google/generative-ai with process.env.GEMINI_API_KEY
- Model: "gemini-2.0-flash"
- Prompt should ask for a personalized daily horoscope based on the natal chart and current transits
- For Russian: "Write in natural, conversational Russian as a native speaker. Use informal form. Use authentic Russian astrological terminology."
- Returns JSON: { horoscope: string }
- Error handling with fallback text

5. app/api/explain/route.ts
- POST handler
- Accepts JSON body: { planet: string, sign: string, house: number, language: "en" | "ru" }
- Uses Gemini to generate a detailed explanation of this placement
- Returns JSON: { explanation: string }

=== INTERNATIONALIZATION ===

Create lib/translations.ts with all UI strings in EN and RU:

English strings: Standard astrology terms
Russian strings (MUST be natural Russian, NOT machine-translated):
- "Discover Your Chart" = "Открой свою карту"
- "Your Celestial Blueprint" = "Твоя звёздная карта"
- "Daily Horoscope" = "Гороскоп на сегодня"
- "Planetary Positions" = "Положение планет"
- "Moon Phase" = "Фаза Луны"
- "Transits" = "Транзиты сегодня"
- "Key Aspects" = "Ключевые аспекты"
- "Sun" = "Солнце", "Moon" = "Луна", "Rising" = "Восходящий знак"
- "Enter your birth details" = "Введи свои данные рождения"
- "Date of Birth" = "Дата рождения"
- "Time of Birth" = "Время рождения"
- "Birth Location" = "Место рождения"
- "Name" = "Имя"
- Use informal form throughout (appropriate for young women)
- Add all zodiac sign names in Russian
- Add all planet names in Russian
- Add moon phase names in Russian
- Add aspect type names in Russian

Create a LanguageContext (React context) and useLanguage hook that reads/saves language preference to localStorage.

=== ZODIAC SYMBOLS MAP ===

Create lib/zodiacSymbols.ts mapping sign names to their Unicode symbols:
Aries=♈, Taurus=♉, Gemini=♊, Cancer=♋, Leo=♌, Virgo=♍, Libra=♎, Scorpio=♏, Sagittarius=♐, Capricorn=♑, Aquarius=♒, Pisces=♓

=== ADDITIONAL REQUIREMENTS ===

- Mobile-first responsive design (works beautifully on iPhone, scales up for desktop)
- Touch-friendly, large tap targets (min 44px)
- Smooth scroll behavior
- Loading states with skeleton/pulse animations
- .env.local is already in .gitignore (verify)
- All components use "use client" where needed for hooks, browser APIs, localStorage
- The globals.css should have the celestial background and base dark theme styles
- tailwind.config.ts should be extended with the custom Lumina color palette
- next.config.mjs should have no special config needed

BUILD ALL OF THIS NOW. Create every file needed for a complete, working application. Do not skip any file. Write complete implementations, not stubs.
