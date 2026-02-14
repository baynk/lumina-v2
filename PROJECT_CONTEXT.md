# Lumina v2 — Project Context

## What This Is
Astrology consultation platform. Built for Iryna (Ryan's ex-girlfriend) to launch as her own business. This project is NOT connected to Ryan's other businesses — it needs its own Google account, Supabase, and eventually its own Vercel.

## Tech Stack
- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS
- **AI:** Google Gemini API (GEMINI_API_KEY)
- **Astronomy:** astronomy-engine library (Swiss Ephemeris precision)
- **Auth:** NextAuth.js with Google Provider (NOT YET CONFIGURED — needs OAuth credentials)
- **Storage:** Supabase (code ready, NOT YET CONFIGURED — needs project creation)
- **Notifications:** Telegram bot (working)
- **Deployment:** Vercel (project: lumina-v2, org: baynks-projects)
- **PM2 local:** `lumina-v2` (port 3400, for local dev only)

## Key Files
- `src/app/page.tsx` — Main page (daily horoscope, birth chart entry)
- `src/app/chart/page.tsx` — Birth chart visualization
- `src/app/consultation/page.tsx` — Consultation request form
- `src/app/profile/page.tsx` — User profile
- `src/app/auth/signin/page.tsx` — Sign-in page (NextAuth)
- `src/app/planet/[name]/page.tsx` — Individual planet detail pages
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth config (Google Provider)
- `src/app/api/chart/route.ts` — Birth chart calculation API
- `src/app/api/horoscope/route.ts` — Daily horoscope via Gemini
- `src/app/api/consultation/route.ts` — Consultation form submission (Telegram + Supabase)
- `src/app/api/explain/route.ts` — AI explanations for chart elements
- `src/app/api/timezone/route.ts` — Timezone lookup from coordinates
- `src/lib/supabase.ts` — Supabase client (with SQL migration in comments)
- `src/services/astronomyCalculator.ts` — Core astronomy calculations
- `src/context/LanguageContext.tsx` — i18n (English/Russian for Iryna's audience)
- `src/components/UserMenu.tsx` — Auth-aware user menu
- `src/components/providers/AuthProvider.tsx` — NextAuth session provider

## Vercel Environment Variables
| Variable | Status | Purpose |
|---|---|---|
| GEMINI_API_KEY | ✅ Set | Google Gemini AI |
| NEXTAUTH_URL | ✅ Set | NextAuth base URL |
| NEXTAUTH_SECRET | ✅ Set | NextAuth JWT secret |
| TELEGRAM_BOT_TOKEN | ✅ Set | Consultation notifications |
| TELEGRAM_CHAT_ID | ✅ Set | Ryan's Telegram (8210649816) |
| GOOGLE_CLIENT_ID | ❌ Missing | Google OAuth sign-in |
| GOOGLE_CLIENT_SECRET | ❌ Missing | Google OAuth sign-in |
| NEXT_PUBLIC_SUPABASE_URL | ❌ Missing | Supabase storage |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ❌ Missing | Supabase storage |

## Blocking Items (Need Ryan)
1. **Google OAuth:** Create a NEW Google account for Lumina (separate from Ryan's), set up Cloud project, create OAuth web credentials, add redirect URI: `https://[lumina-domain]/api/auth/callback/google`
2. **Supabase:** Create project at supabase.com under Lumina's Google account, run CREATE TABLE SQL (in src/lib/supabase.ts comments), provide URL + anon key

## Astrology System
- **Zodiac:** Tropical
- **House System:** Equal House (differs from Placidus by ~5° at boundaries)
- **Engine:** astronomy-engine (Swiss Ephemeris precision)
- **Timezone:** @photostructure/tz-lookup (works on Vercel serverless, unlike geo-tz)
- **Accuracy:** Celebrity audits pass 9/10

## Important Notes
- This is for IRYNA (Russian), not Susana. Don't mix them up.
- Iryna reviews translations (English/Russian)
- Vercel deployment URLs use hash suffixes (deployment-specific). Production URL may change.
- Current Vercel URL: https://lumina-v2-a21vw05vf-baynks-projects.vercel.app
- In-app browsers (Telegram/WhatsApp) don't persist localStorage — always derive timezone from coordinates

## Deploy
```bash
cd /home/ubuntu/.openclaw/workspace/projects/lumina-v2
npx vercel --prod
```
