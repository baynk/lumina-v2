# Spec — Lumina Stripe consultation flow

## Precision tier
Architecture

## Problem
Lumina has Stripe backend routes and webhook handling, but the consultation page is still using the old flow: written readings are request-first with payment later, and video consultations send users to Calendly before Stripe. Ryan wants payment first for all tiers, then booking/intake afterwards.

## Goal
When a user selects any consultation tier (€25 written, €35 video-40, €55 video-60), they should be routed through Stripe Checkout first. After successful payment:
- written consultation → user lands back in Lumina and completes/submits the intake form
- video consultations → user lands back in Lumina, completes the intake form, and then is sent to Calendly to pick a time

If the user is not signed in, selecting a tier should send them to Google sign-in first, then return them to the chosen tier.

## Decision record
1. **Use OAuth-backed coding path (Codex), not raw API** — requested by Ryan
2. **Keep Google auth, do not add new auth providers** — existing app already uses NextAuth Google and this is enough to identify user for Stripe customer creation
3. **Use Stripe price IDs from env for all three tiers** instead of inline `price_data` amounts in code — reduces drift between app and Stripe dashboard
4. **Payment before intake** — requested by Ryan for all tiers
5. **Success flow returns to consultation page with query params** (not homepage) — simplest way to resume context after checkout
6. **Do not remove Calendly** — video tiers still use it, but only after successful payment and intake submission

## Interfaces
### Existing routes
- `POST /api/payments/create-checkout` — creates Stripe session (needs update)
- `POST /api/payments/webhook` — handles Stripe webhook (already exists)
- `GET /api/payments/status` — subscription status only (not relevant for consult flow)
- `POST /api/consultation` — persists consultation request/intake
- `GET/POST /api/auth/*` — Google sign in

### New query params on `/consultation`
- `type=written|video-40|video-60` — selected tier
- `paid=1` — indicates Stripe checkout already completed
- `session_id=...` — Stripe checkout session id (from success URL)

### Required env vars
Keep existing:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Add/use these for tier price IDs:
- `STRIPE_PRICE_CONSULTATION_WRITTEN`
- `STRIPE_PRICE_CONSULTATION_VIDEO_40`
- `STRIPE_PRICE_CONSULTATION_VIDEO_60`

Map to current values provided by Ryan:
- written = `price_1TEbHPAOHkihqu638byoo2pz`
- video-40 = `price_1TEbIlAOHkihqu63Xzoh5cgK`
- video-60 = `price_1TEbJqAOHkihqu631BcTzvZp`

## Behavior
### 1. Tier selection
When a user clicks a tier card on `/consultation`:
- if unauthenticated → redirect to `/auth/signin?callbackUrl=/consultation?type=<tier>`
- if authenticated and not paid → call `POST /api/payments/create-checkout` with the correct type, redirect browser to returned Stripe Checkout URL
- if authenticated and already returning from successful checkout (`paid=1`) → skip Stripe, show the intake form directly

### 2. Checkout creation route
Update `POST /api/payments/create-checkout`:
- use env price IDs for all three consultation tiers (written/video-40/video-60)
- keep one-time payment mode for consultation tiers
- success URL should be:
  - written: `${baseUrl}/consultation?type=written&paid=1&session_id={CHECKOUT_SESSION_ID}`
  - video-40: `${baseUrl}/consultation?type=video-40&paid=1&session_id={CHECKOUT_SESSION_ID}`
  - video-60: `${baseUrl}/consultation?type=video-60&paid=1&session_id={CHECKOUT_SESSION_ID}`
- cancel URL remains `/consultation`
- metadata should include `user_id` and `checkout_type`

### 3. Consultation page state
Update `/consultation` page to read search params on load.
- `type` param pre-selects the chosen tier
- `paid=1` changes the UI state:
  - written: replace CTA text with “Submit details” / equivalent RU copy; no payment language
  - video: show the intake form and only open Calendly after form submission
- if `paid` is absent, show Stripe-first CTA labels:
  - written: “Continue to payment · €25”
  - video-40: “Pay & continue · €35”
  - video-60: “Pay & continue · €55”

### 4. Success state
No standalone payment success page is needed for consultations anymore. Success URL sends users directly back into the right consultation flow.
Keep `/payment/success` for any future premium subscription flow, but it is no longer part of consultation checkout.

### 5. Webhook behavior
Leave existing webhook handler in place. It already records checkout completions and updates the user/payment tables.

## Edge cases / failure modes
1. **User clicks tier while signed out** → must route through Google sign-in and preserve intended tier in callback URL
2. **Stripe env vars exist but price env vars missing** → return clear 500 from checkout route with message indicating which price is missing
3. **User pays, then closes tab before filling intake** → returning to `/consultation?type=<tier>&paid=1` should still let them complete the form
4. **User clicks back from Stripe cancel** → should return to `/consultation` cleanly without broken state
5. **Video consultation paid but user never books Calendly** → still have consultation data once form is submitted; no silent loss
6. **Written consultation paid but form never submitted** → user can return and finish later via saved `type` + `paid` query state
7. **Double-clicking pay buttons** → disable button while checkout request is in flight
8. **Invalid `type` query param** → ignore and show the default selector view

## Scope boundaries
Included:
- wiring consultation tiers to Stripe Checkout
- returning users into the correct flow after payment
- sign-in redirect preservation
- env var mapping for provided price IDs
- UI copy changes for paid vs unpaid states

Not included:
- premium subscription product flow
- admin dashboard payment reconciliation improvements
- emailing receipts or intake confirmations
- Calendly webhook integration
- refunds / customer portal

## Acceptance criteria
1. Given a signed-out user clicks “Written Reading”, when they complete Google sign-in, then they return to the written tier and are sent to Stripe checkout
2. Given a signed-in user clicks a tier, when checkout is created, then they are redirected to Stripe and not shown the old manual flow
3. Given a successful written checkout, when Stripe redirects back, then the written intake form appears and the CTA is `Submit details` (not a payment CTA)
4. Given a successful video checkout, when Stripe redirects back, then the video intake form appears and submitting it opens Calendly
5. Given missing Stripe price env vars, when checkout is requested, then the API returns a clear error instead of silently failing
6. Given deployed env vars + redeploy, when a tier is clicked in production, then Stripe Checkout opens successfully
