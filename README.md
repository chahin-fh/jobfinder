# 🔍 JobFinder

**match · connect · grow** — a real-time client ↔ freelancer matching platform built with SvelteKit and Supabase.

Clients post what they need, freelancers pick what they do, and a live matching queue pairs them instantly over shared categories — with built-in real-time chat, typing indicators, rich profiles, and an admin dashboard for moderation.

---

## ✨ Features

### Matching & Queue
- **Role-based onboarding** — sign up as a *client* (looking for help) or *freelancer* (offering services)
- **Category selection** — pick from seeded categories (Web Dev, Mobile, Design, Marketing, …) or request a custom one
- **Live matching queue** — join the queue and get paired instantly with an opposite-role user sharing at least one category; otherwise the app polls until a match appears
- **Match confirmation** — both sides can confirm the match from the chat panel

### Real-time Chat
- **1-on-1 chat per match** backed by Supabase Realtime (`postgres_changes` on `chat_messages`)
- **Typing indicators** via Supabase broadcast channels
- **Dedicated messages page (`/messages`)** — chat list + active conversation, opened from the 💬 button in the header on any page

### Profiles
- Editable profile: title, bio, location, hourly rate, availability
- Skills (with level bars), portfolio projects, languages, and reviews
- Stats like jobs done, success rate, and response time

### Admin Dashboard (`/dashboard`)
- Platform stats: users, clients vs freelancers, matches, confirmed matches, chat messages, waiting queue
- **Category moderation** — review user-submitted categories and approve/reject them
- Visible only to users with `is_admin` on their profile

### Auth
- Email/password login & signup through Supabase Auth
- **Remember me** checkbox on the login form (preference stored in `localStorage`)
- Sessions persist in cookies via `@supabase/ssr`, so you stay signed in across page reloads
- Server-side session handling via SvelteKit hooks + cookie-based Supabase SSR client

---

## 🛠 Tech Stack

| Layer      | Technology |
|------------|------------|
| Framework  | [SvelteKit 2](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev/docs/svelte) (runes: `$state`, `$derived`, `$effect`) |
| Language   | TypeScript |
| Build      | Vite (rolldown) |
| Backend    | [Supabase](https://supabase.com) — Auth, Postgres, Realtime |
| SSR auth   | `@supabase/ssr` cookie-based server client in `src/hooks.server.ts` |
| Styling    | Scoped Svelte `<style>` blocks + shared CSS (`src/lib/assets/animations.css`) |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- A free [Supabase](https://supabase.com) project

### 2. Install dependencies

```sh
npm install
```

### 3. Configure environment

Create a `.env` file in the project root (it's git-ignored) with your Supabase credentials:

```sh
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

You'll find both values in your Supabase dashboard under **Project Settings → API**.

### 4. Set up the database

Open the **SQL Editor** in your Supabase dashboard and run, in order:

1. `src/lib/server/schema.sql` — creates all tables (`categories`, `profiles`, `queue_entries`, `matches`, `chat_messages`, `profile_skills`, `profile_portfolio`, `profile_languages`, `profile_reviews`), seeds the default categories, enables Row Level Security, and registers tables for Realtime
2. `src/lib/server/migrations/002_admin_dashboard.sql` — adds the admin dashboard + category moderation tables/columns
3. `src/lib/server/migrations/003_fix_admin_rls_recursion.sql`
4. `src/lib/server/migrations/004_fix_matches_insert_policy.sql`
5. `src/lib/server/migrations/005_fix_chat_messages_insert_policy.sql`

> 💡 To make yourself an admin, set `is_admin = true` on your row in the `profiles` table after signing up.

### 5. Run the dev server

```sh
npm run dev

# or open the app in a new browser tab
npm run dev -- --open
```

The app runs at `http://localhost:5173`.

---

## 📜 Scripts

| Command              | Description |
|----------------------|-------------|
| `npm run dev`        | Start the Vite dev server |
| `npm run build`      | Production build |
| `npm run preview`    | Preview the production build locally |
| `npm run check`      | Type-check with `svelte-check` |
| `npm run check:watch`| Type-check in watch mode |

---

## 🗺 App Structure

### Pages

| Route        | Purpose |
|--------------|---------|
| `/`          | Marketing landing page |
| `/app`       | The main app — auth → onboarding → matching → profile view |
| `/messages`  | Messages page — chat list + active conversation (auth required) |
| `/profile`   | Standalone profile page |
| `/dashboard` | Admin dashboard (stats + category moderation, admin-only) |

### Onboarding flow (`/app`)

```
login → signup → role selection → category selection → searching → matched → chat
```

The flow is driven by a single reactive store (`src/lib/stores/queue.svelte.ts`) using Svelte 5 runes.

### API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/signup` | POST | Create a Supabase auth user |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | Sign out |
| `/api/categories` | GET / POST | List approved categories / request a new one (pending) |
| `/api/queue/join` | POST | Join the matching queue (attempts instant match) |
| `/api/queue/match` | POST | Poll for a match |
| `/api/queue/status` | GET | Current queue status |
| `/api/queue/leave` | POST | Leave the queue |
| `/api/matches` | GET | List your matches (with last message) |
| `/api/matches/[id]/messages` | GET / POST | Fetch / send chat messages |
| `/api/matches/[id]/confirm` | POST | Confirm a match |
| `/api/profile` | GET / PUT | Read / update your profile (skills, portfolio, languages, reviews) |
| `/api/admin/stats` | GET | Admin dashboard statistics |
| `/api/admin/categories` | GET | List categories incl. pending ones |
| `/api/admin/categories/[id]/review` | POST | Approve / reject a pending category |

### Project layout

```
src/
├─ hooks.server.ts          # Supabase SSR client + session helper
├─ lib/
│  ├─ supabase.ts           # Browser client (remember-me aware)
│  ├─ types.ts              # Shared TypeScript types
│  ├─ utils.ts              # Helpers (e.g. initials)
│  ├─ data/categories.ts    # Fallback category seed data
│  ├─ stores/queue.svelte.ts# Core app state machine (runes)
│  ├─ components/           # LoginForm, SignupForm, RoleSelector,
│  │                        # CategorySelector, QueueSearch, MatchFound,
│  │                        # ChatPanel, ChatInterface, ChatHistory,
│  │                        # FloatingChatButton, Profile, StepProgress…
│  └─ server/
│     ├─ supabase.ts        # Server-side Supabase helpers
│     ├─ admin.ts           # Admin queries
│     ├─ admin-stats.ts     # Dashboard stats aggregation
│     ├─ schema.sql         # Full database schema + seed data
│     └─ migrations/        # Incremental SQL migrations (002–005)
└─ routes/                  # Pages + API endpoints (see tables above)
```

---

## 🔒 Security Notes

- All tables use **Row Level Security** — users can only read/write their own profiles, queue entries, matches, and messages
- API endpoints verify the Supabase session server-side before acting
- The anon key is safe to expose in the client; privileged operations stay in SvelteKit server routes

---

## 📦 Deployment

The project uses `@sveltejs/adapter-auto`, which detects your target platform (Vercel, Netlify, Cloudflare, etc.) at build time. To deploy:

```sh
npm run build
```

Then follow the [SvelteKit adapter docs](https://svelte.dev/docs/kit/adapters) for your hosting provider, and make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in your host's environment variables.# jobfinder
