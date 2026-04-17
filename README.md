# Guess the Object in English

Production-minded realtime game built with Next.js App Router, TypeScript, Tailwind, shadcn/ui, and Supabase (Postgres/Auth/Storage/Realtime).

## Stack
- Next.js App Router (Route Handlers in `app/api`)
- TypeScript strict mode
- Tailwind CSS + shadcn/ui components
- Supabase SSR (`@supabase/ssr`) with cookie-based auth
- Supabase Postgres + RLS + Storage + Realtime

## Features
- Admin login and protected admin panel
- CRUD game sets (10 answers with aliases)
- Image upload to Supabase Storage bucket (`game-images`)
- Create/start/finish game sessions
- Participant join via display name
- Single submission per participant
- Server-side answer evaluation only (no browser scoring)
- Real-time leaderboard updates via Supabase Realtime
- CSV export for leaderboard

## 1) Prerequisites
- Node.js 20+
- npm 10+
- Supabase project
- Supabase CLI (recommended)

## 2) Environment Variables
Copy `.env.example` to `.env.local` and fill:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PARTICIPANT_COOKIE_SECRET` (long random secret)

Optional:
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (default `game-images`)
- `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`)
- `MAX_UPLOAD_SIZE_MB` (default `5`)

## 3) Install & Run
```bash
npm install
npm run dev
```

Useful scripts:
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`

## 4) Supabase Database Setup
Run migration SQL:

- `supabase/migrations/20260417162000_init_schema.sql`

Then run seeds:

- `supabase/seeds/20260417162500_initial_game_set.sql`

Promote one auth user to admin:

- Edit email in `supabase/seeds/20260417162600_promote_admin.sql`
- Execute the SQL after that user has signed up

## 5) Storage Setup
Migration creates bucket/policies for `game-images`.
Admin uploads are validated by MIME and max file size in API route.

## 6) Security Notes
- Scores are computed only in server route handler (`/api/sessions/[id]/submit`)
- Official answer keys are never sent to participant pages before session finish
- Admin actions are guarded by profile role checks (`profiles.role = admin`)
- RLS is enabled for all core tables
- Participant identity is secured with signed HttpOnly cookie + hashed token table

## 7) Realtime Behavior
- Leaderboard table subscribes to `submissions` and session updates
- Participant/admin pages refresh state when session status changes

## 8) Initial Seeded Game Set
- Title: `Living Room Object Quiz 01`
- Description: `Guess the English names of the numbered objects in the room.`
- Image path: `game-sets/placeholder-living-room-01.png`
- 10 official answers and aliases inserted in seed SQL

## 9) CSV Export
Admin session detail page includes CSV download endpoint:
- `GET /api/sessions/:id/leaderboard.csv`

## 10) Project Structure
Core paths:
- `src/app/(public)` participant/public pages
- `src/app/admin` admin pages
- `src/app/api` route handlers
- `src/lib/services` business logic
- `src/lib/supabase` SSR/client/service-role setup
- `src/lib/validations` Zod schemas
- `supabase/migrations` SQL schema + RLS
- `supabase/seeds` seed data and admin promotion script
