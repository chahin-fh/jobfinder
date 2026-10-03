# JobFinder

Real-time freelancer ↔ client matching. Instead of bidding wars and endless
browsing, both sides join a queue for the categories they care about and get
paired with a complementary role, then agree the scope in a private 1:1 chat.

Built with **SvelteKit (Svelte 5 runes) + TypeScript + Supabase** (Auth, Postgres
with Row Level Security, Realtime and Storage). Deployed on Vercel.

## Features

- **Email/password auth** with server-side session cookies (`@supabase/ssr`).
  Identity is always verified with `auth.getUser()` on the server.
- **Guided onboarding** — pick a role (client / freelancer) → pick categories →
  enter the live matching queue.
- **Atomic matching** — one Postgres function decides matches, so two users
  searching at once can never both grab the same candidate or create duplicate
  threads. Queue entries expire after 15 minutes.
- **Real-time chat** — Supabase Realtime delivers messages and notifications
  without a page refresh, backed by polling as a fallback.
- **Read receipts** — unread badges that actually reset.
- **Engagements** — both sides propose and sign off on scope + amount. No money
  moves in the app yet; this is the agreement record.
- **Counterparty reviews** — only a participant of a *confirmed* match can review
  the other side, once. Reviews are mirrored onto the subject's public profile.
- **Notifications** — in-app notification centre (Realtime) plus optional
  transactional email via Resend.
- **Freelancer directory** (`/freelancers`) built on a `public_profiles` view that
  exposes only presentational columns (never emails or admin flags).
- **Profiles** with avatar upload (Supabase Storage), skills, portfolio and
  languages.
- **Admin dashboard** (`/dashboard`) with site reports, the real signup count and
  the pending-category moderation queue.

## Getting started

```sh
npm install
cp .env.example .env     # then fill in your Supabase URL + anon key
npm run dev
```

### Database setup

Run the SQL files in the Supabase SQL editor, in order:

1. `src/lib/server/schema.sql` — tables, seed categories, RLS policies.
2. `src/lib/server/migrations/002_admin_dashboard.sql` — `is_admin`, category
   moderation, admin RLS, unique category names.
3. `src/lib/server/migrations/003_fix_admin_rls_recursion.sql` — repairs admin
   policies to use the `public.is_admin()` helper.
4. `src/lib/server/migrations/004_fix_matches_insert_policy.sql` — match insert
   policy (fresh installs already get this from `schema.sql`).
5. `src/lib/server/migrations/005_hardening.sql` — **required**: removes the
   over-permissive queue policy, adds the atomic `try_match()` function, the
   one-match-per-pair index, read receipts, engagements, reviews, notifications,
   avatars, the directory views and the `handle_new_user` profile trigger.
6. `src/lib/server/migrations/006_fix_try_match_category_ambiguity.sql` — fixes
  ambiguous `category_id` resolution in the matching function.
7. `src/lib/server/migrations/007_engagement_proposal_notifications.sql` — alerts
  the other participant when terms are proposed or updated.

> Migration 005 deletes duplicate matches before adding the uniqueness index (it
> cascades to their chat messages), so take a backup first if the database
> already has real data.

### Making yourself an admin

```sql
UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
```

### Email notifications (optional)

Set `RESEND_API_KEY` (and optionally `RESEND_FROM`). Without it the app sends no
email and only uses in-app notifications — nothing breaks.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run check` | `svelte-check` type/diagnostics pass |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (writes) |

CI (`.github/workflows/ci.yml`) runs check, lint, tests and a build on every push
and pull request.

## Deployment

The project uses `@sveltejs/adapter-vercel` and ships a `vercel.json`. Import the
repo into Vercel and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
(optionally) `RESEND_API_KEY` / `RESEND_FROM` in the project's environment
variables.

**Windows note:** the Vercel adapter creates symlinks in `.vercel/output`, which
Windows refuses unless Developer Mode is enabled. Building locally on Windows
therefore needs Developer Mode (Settings → System → For developers), WSL, or
Docker. On Linux/macOS (and Vercel itself) it works as-is.

## Project layout

```
src/
  hooks.server.ts     Supabase SSR client + safeGetSession() (verified user)
  lib/
    components/       UI (onboarding, chat, engagement panel, notifications…)
    data/             Static fallback categories
    format.ts         Pure display helpers (relative time, money)
    engagement.ts     Pure agreement state machine
    realtime.ts       Realtime INSERT subscription helper
    server/           Server-only code (auth guard, matching, email, stats) + SQL
    stores/           Svelte 5 rune stores (queue flow, messenger, notifications)
    supabase.ts       Browser client
  routes/
    api/              JSON endpoints (queue, matches, messages, notifications, admin)
    app/              The matching flow
    dashboard/        Admin-only reports + moderation
    freelancers/      Public directory
    messages/         Conversation list + messenger
    profile/          Profile viewer/editor
```

## Security notes

- Server-side identity always comes from `auth.getUser()` (see
  `src/lib/server/auth.ts`); `getSession()` is never trusted for authorisation.
- Cross-user data (counterpart names, contact emails, matching) goes through
  narrow `SECURITY DEFINER` functions/views rather than widening table policies.

## Known gaps / next steps

- No payment provider yet — engagements record the agreed scope and amount, but
  nothing is charged. Stripe Checkout would slot into
  `/api/matches/[id]/engagement`.
- `success_rate` and `response_time` are not yet computed from real activity
  (only `jobs_done` is).
- Prettier is configured but not enforced in CI, so `npm run format:check` will
  flag pre-existing files until they are formatted once.
- The stores have no unit tests; only the pure helpers do.
