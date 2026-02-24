# Lumina — Project Context

> **For AI assistants**: This document gives you the full picture of the project. Read it before making changes.

## What is Lumina?

Lumina is a bilingual (English/Russian) astrology web app at **luminastrology.com**. It calculates natal charts with space-agency-grade precision (JPL DE421 ephemeris) and provides AI-powered interpretations. The target audience is Russian-speaking women aged 22–40 who are curious about astrology — sophisticated, not naive.

**Brand feel**: Intimate, warm but mysterious, elegant, trustworthy. Think "antique celestial atlas viewed by candlelight." The color palette is deep navy/midnight with purple/lilac accents.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + custom theme in `globals.css` |
| Auth | NextAuth.js (Google OAuth via `luminastrology@gmail.com`) |
| Database | Vercel Postgres (Neon) |
| AI | Google Gemini 2.0 Flash (`@google/generative-ai`) |
| Astronomy | `astronomy-engine` (JPL DE421 ephemeris) — custom calculators |
| Maps | Mapbox GL JS (astrocartography) |
| Deploy | Vercel (auto-deploys from `main` branch) |
| Domain | luminastrology.com (Vercel nameservers) |

## Git Workflow

- `main` — production (what's live on luminastrology.com)
- `staging` — development branch (deploy with `vercel --prod`, then merge to main)
- Feature branches — branch off `staging`, get Vercel preview URLs automatically

```
staging → feature-branch → PR → staging → main
```

## Directory Structure

```
src/
├── app/                          # Next.js App Router pages + API routes
│   ├── page.tsx                  # Homepage (landing for new users, dashboard for returning)
│   ├── chart/page.tsx            # Full natal chart with wheel, planets, aspects
│   ├── synastry/page.tsx         # Compatibility/synastry calculator
│   ├── transits/page.tsx         # Current transits
│   ├── profile/page.tsx          # User profile (Big Three, partner, settings)
│   ├── consultation/page.tsx     # Book a consultation with Iryna
│   ├── story-of-you/page.tsx     # AI-generated onboarding narrative
│   ├── journal/page.tsx          # Moon journal
│   ├── landing/page.tsx          # Full marketing landing page
│   ├── compatibility/[id]/       # Public shareable compatibility results
│   ├── admin/                    # Admin panel (protected)
│   │   ├── page.tsx              # Dashboard with stats, users, consultations
│   │   ├── client/[id]/page.tsx  # Practitioner workspace (natal chart + tools)
│   │   └── user/[id]/page.tsx    # Individual user detail view
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/   # NextAuth Google OAuth
│   │   ├── user/                 # User profile CRUD
│   │   ├── admin/                # Admin endpoints (stats, users, consultations)
│   │   ├── horoscope/            # AI daily horoscope generation
│   │   ├── synastry/             # AI synastry narrative generation
│   │   ├── explain/              # AI planet placement explanation
│   │   ├── transits/             # AI transit interpretation
│   │   ├── onboarding-story/     # AI "Story of You" generation
│   │   ├── moon-ritual/          # AI moon ritual content
│   │   ├── solar-return/         # Solar return chart calculation
│   │   ├── astrocartography/     # Astrocartography line calculation
│   │   ├── synastry-result/      # Save/retrieve shareable synastry results
│   │   ├── consultation/         # Consultation booking submission
│   │   ├── connections/          # Partner connection codes
│   │   ├── geocode/              # Nominatim geocoding proxy
│   │   ├── timezone/             # Timezone lookup from coordinates
│   │   ├── push/                 # Web push notification endpoints
│   │   ├── telegram/             # Telegram bot webhook + daily sender
│   │   └── chart/                # Chart data endpoint
│   ├── layout.tsx                # Root layout (fonts, providers, nav)
│   └── globals.css               # Global styles + celestial theme
├── components/                   # Shared React components
│   ├── BirthDataForm.tsx         # Reusable birth data entry form
│   ├── BottomNav.tsx             # Mobile bottom navigation bar
│   ├── LandingContent.tsx        # Landing page content (used by page.tsx)
│   ├── LanguageToggle.tsx        # EN/RU language switcher
│   ├── UserMenu.tsx              # Auth menu (sign in/out, avatar, profile link)
│   ├── ShareCard.tsx             # Shareable compatibility card (image generation)
│   ├── RadarChart.tsx            # SVG radar chart for synastry scores
│   ├── ExplainModal.tsx          # Planet explanation slide-over modal
│   ├── BigThree.tsx              # Sun/Moon/Rising display component
│   ├── MoonPhase.tsx             # Moon phase display
│   ├── MoonPhaseVisual.tsx       # Visual moon phase renderer
│   ├── PlanetCard.tsx            # Individual planet info card
│   ├── HoroscopeSection.tsx      # Daily horoscope section
│   ├── BlurGate.tsx              # Blur overlay for premium content
│   ├── Footer.tsx                # App footer
│   ├── SolarReturnChart.tsx      # Solar return chart component
│   ├── PushPrompt.tsx            # Push notification permission prompt
│   ├── admin/NatalWheel.tsx      # SVG natal chart wheel (admin)
│   ├── astrocartography/         # Astrocartography map components
│   ├── icons/                    # Planet + zodiac icon components
│   └── providers/                # React context providers (auth, app)
├── context/
│   └── LanguageContext.tsx        # Language state (EN/RU) with all translations
├── lib/                          # Utilities and helpers
│   ├── profile.ts                # localStorage profile management
│   ├── db.ts                     # Postgres database queries
│   ├── translations.ts           # Translation strings (EN/RU)
│   ├── types.ts                  # TypeScript type definitions
│   ├── zodiac.ts                 # Zodiac sign utilities
│   ├── zodiacSymbols.ts          # Unicode zodiac symbols
│   ├── education.ts              # Educational content data
│   ├── astronomyCalculator.ts    # Wrapper for astronomy calculations
│   ├── pushNotifications.ts      # Web push utilities
│   └── telegram.ts               # Telegram bot utilities
├── services/                     # Core calculation engines
│   ├── astronomyCalculator.ts    # Natal chart calculator (JPL DE421)
│   ├── synastryCalculator.ts     # Synastry/compatibility calculator
│   ├── transitCalculator.ts      # Current transit calculator
│   ├── solarReturnCalculator.ts  # Solar return calculator
│   └── astrocartographyCalculator.ts  # Astrocartography line calculator
└── types.ts                      # Shared TypeScript types
```

## Design System

### Colors (Tailwind config)
- `midnight` (#080C1F) — primary background
- `indigoNight` (#0F1433) — card backgrounds
- `purpleBlack` (#1A1040) — deeper accents
- `lumina-accent` (#C4B5FD) — primary purple accent
- `lumina-accent-bright` (#A78BFA) — brighter purple
- `lumina-accent-muted` (#8B7DCF) — muted purple
- `lumina-soft` (#E8E0F6) — soft heading color
- `warmWhite` (#F5F0EB) — primary text
- `cream` (#C8BFB6) — secondary text

### CSS Classes (globals.css)
- `.glass-card` — frosted glass card with border and backdrop blur
- `.lumina-card` — standard card styling
- `.lumina-button` — primary CTA button (purple gradient)
- `.lumina-input` — form input styling
- `.lumina-label` — uppercase tracking label
- `.lumina-section-title` — section heading
- `.celestial-gradient` — background gradient overlay
- `.star-field` — animated star background

### Fonts
- Heading: Cormorant Garamond (serif) via `--font-heading`
- Body: Inter (sans-serif) via `--font-inter`

### Responsive Breakpoints
- Mobile: < 640px (default)
- Tablet: 640px (`sm:`)
- Desktop: 1024px (`lg:`)
- Large: 1280px (`xl:`)

## Database Schema (Vercel Postgres / Neon)

```sql
users (id UUID PK, email, name, google_id, avatar_url, birth_date, birth_time,
       birth_place, birth_latitude, birth_longitude, birth_timezone,
       onboarding_completed, connection_code, gender, relationship_status,
       interests JSONB, created_at, updated_at)

consultations (id UUID PK, user_id FK, name, email, phone, topics JSONB,
              question, preferred_format, status, birth_date, birth_time,
              birth_place, unsure_birth_time, submitted_at)

saved_charts (id UUID PK, user_id FK, chart_type, chart_data JSONB, created_at)

push_subscriptions (id UUID PK, user_id FK, endpoint, p256dh, auth, created_at)

partner_connections (id UUID PK, user_id FK, partner_name, partner_birth_date,
                    partner_birth_time, partner_birth_place, partner_latitude,
                    partner_longitude, partner_timezone, connected_user_id,
                    created_at)

synastry_results (id TEXT PK, user_id, person_a_name, person_b_name,
                 person_a_sun, person_b_sun, overall_score,
                 result_json JSONB, created_at)
```

## Key Architectural Decisions

1. **Mobile-first**: Designed for phones, responsively adapted for desktop
2. **localStorage + server sync**: Birth data cached locally for speed, synced to Postgres when signed in
3. **AI content is ephemeral**: Generated per-request via Gemini, cached in localStorage only
4. **Bilingual (EN/RU)**: All UI strings in `translations.ts`, all AI prompts have full Russian versions
5. **No client-side astronomy**: All chart calculations happen server-side or in service workers
6. **Privacy-first partner connections**: Private invite codes (LUNA-XXXX), no social graph
7. **Admin panel**: Only accessible to whitelisted emails (`@ryanwright.io`, `luminastrology@gmail.com`)

## AI Content Routes

All 6 AI routes use Gemini 2.0 Flash. For Russian, the **entire prompt** is written in Russian (not English + "write in Russian") to prevent language mixing:

- `/api/horoscope` — personalized daily horoscope
- `/api/synastry` — relationship compatibility narrative
- `/api/explain` — planet placement interpretation
- `/api/transits` — transit impact explanation
- `/api/onboarding-story` — "Story of You" narrative
- `/api/moon-ritual` — moon phase ritual content

## Environment Variables (Vercel)

Required env vars (set in Vercel dashboard):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — NextAuth config
- `POSTGRES_*` — Vercel Postgres connection (auto-set)
- `GEMINI_API_KEY` — Google Gemini API
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — Web push notifications
- `MAPBOX_TOKEN` — Mapbox GL for astrocartography

## Important Rules

- **Russian AI content**: When language is RU, write the ENTIRE prompt in Russian. Don't use English instructions with "write in Russian" — Gemini ignores it.
- **Sign-out cleanup**: `clearProfile()` in `src/lib/profile.ts` wipes ALL localStorage keys. If you add new cached data, add its cleanup there too.
- **Server-side profile fallback**: All pages (home, chart, profile, synastry) fall back to `/api/user` when localStorage is empty but user is signed in.
- **Admin emails**: Hardcoded in `/api/admin/route.ts` and `/api/auth/[...nextauth]/route.ts`
- **Consultation pricing**: Written €25, Video 40min €35, Deep Dive 60min €55
