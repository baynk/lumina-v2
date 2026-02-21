# Lumina QA Audit Report

## Scope audited
- Codebase structure and auth/state architecture in `src/app`, `src/lib`, `src/components`.
- End-to-end auth flow: sign-in, sign-out, session handling, route protection.
- Protected route guards and unauthorized redirects.
- Client-side persistence/state leaks after sign-out.
- Form validation paths (client + server) for high-traffic forms.

## Bugs found and fixed

### 1) Critical: Sign-out cleanup was incomplete and inconsistent
- **Impact:** User/session-adjacent data could persist after logout, especially if sign-out was initiated from different UI entry points.
- **Root cause:** Sign-out logic was duplicated and only partially cleared profile keys.
- **Fix applied:** Added centralized logout utility in `src/lib/authClient.ts`:
  - Clears profile data.
  - Removes all Lumina localStorage keys (`lumina_` and `lumina-`) while preserving `lumina_language`.
  - Removes NextAuth-related localStorage keys (if present).
  - Clears `sessionStorage`.
  - Calls `signOut({ redirect: false })` and then hard-redirects with `window.location.replace(...)` to force clean app state.
- **Wired into:**
  - `src/components/UserMenu.tsx`
  - `src/app/admin/page.tsx`

### 2) Critical: No server-side guard for protected admin routes
- **Impact:** Admin pages relied on client-only checks; direct navigation could load protected route shells before client checks resolved.
- **Root cause:** Missing `middleware.ts` route guard.
- **Fix applied:** Added `middleware.ts` to protect `/admin/:path*`:
  - Validates session token via `getToken`.
  - Redirects unauthenticated users to `/auth/signin` with `callbackUrl`.
  - Enforces admin email/domain check for `/admin` routes.
  - Adds no-store/no-cache headers on protected routes.

### 3) High: Client route guard did not always force redirect for unauthenticated state
- **Impact:** In some transitions (expired session, rapid navigation), users could remain on admin UI error states instead of being redirected.
- **Fix applied:** Added explicit unauthenticated redirects in:
  - `src/app/admin/page.tsx`
  - `src/app/admin/client/[id]/page.tsx`

### 4) Medium: Birth data form accepted impossible calendar dates
- **Impact:** Invalid dates (e.g. 31/02) could pass client checks and produce unreliable chart calculations.
- **Fix applied:** Added strict calendar date validation and inline error messaging in `src/components/BirthDataForm.tsx`.

### 5) Medium: Synastry form accepted impossible calendar dates
- **Impact:** Invalid partner/user dates could be submitted, causing bad calculations or confusing failures.
- **Fix applied:** Added strict calendar date validation to submission gating and clear error messaging in `src/app/synastry/page.tsx`.

### 6) Medium: Consultation form validation was too permissive
- **Impact:** Invalid email/date/time formats could be submitted.
- **Fix applied (client):** Added validation + user-facing errors in `src/app/consultation/page.tsx` for:
  - Email format
  - Birth date format (`DD.MM.YYYY`)
  - Birth time format (`HH:MM`) when time is required
- **Fix applied (server):** Added matching API-side validation and `400` responses in `src/app/api/consultation/route.ts`.

## Verification performed
- `npm run build` completed successfully after fixes.
- Confirmed protected routes are now middleware-protected in build output (`/admin`, `/admin/client/[id]` dynamic and guarded).

## Notes / pre-existing issues observed (not introduced by this QA patch)
- `npm run lint` is not currently runnable in CI/non-interactive mode because project ESLint config has not been initialized (Next.js prompt appears).
- `npx tsc --noEmit` reports pre-existing type issues unrelated to this QA patch in existing auth/db files.
