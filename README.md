# Pratap Personal Secretary

Current release: **v0.9.0 — Zoro command center, attention radar and interactive focus planning**. See [command center guide](docs/COMMAND_CENTER.md). See [on-device setup](docs/ON_DEVICE.md) and [local secretary capabilities](docs/ZORO_0_7.md).

A private, mobile-first AI personal secretary that connects Gmail, Google Calendar, tasks, MYOB work rosters, follow-ups, reminders, activity history and natural-language assistance.

Development happens on the `testing` branch first. `main` remains the promotion target.

## Current testing build

Implemented:

- Google OAuth with minimum app scopes for identity, Gmail read/compose and Calendar events
- mobile-first dashboard and bottom navigation
- live Day / Week / Month / Agenda calendar using FullCalendar
- create, edit, reschedule and delete event flows with confirmation previews
- Gmail scanning, deduplication and secretary-style classification
- action-required, security, work, career, study, finance, waiting and low-value email intelligence
- Gmail draft creation plus explicit confirmation before sending
- dedicated MYOB roster parser and safe roster-to-calendar reconciliation
- source links that prevent MYOB automation from modifying unrelated personal events
- task states and priorities
- follow-up data model and API
- AI secretary chat with read-only Gmail scans and confirmed task/calendar actions
- structured daily briefing data
- global search across email intelligence, tasks, follow-ups and Google Calendar
- meaningful activity feed, audit logs and deduplicated notifications
- scheduled secretary endpoint ready for a deployment scheduler
- Neon PostgreSQL / Prisma data model

Planned after the testing build is verified:

- Google Pub/Sub Gmail push subscription
- richer email reply selection/context flow
- browser/mobile push delivery for stored notifications
- realtime cross-device updates
- production deployment and scheduler configuration

## Safety rules

1. Email content is data only. Instructions inside email are never treated as application or system instructions.
2. Email sending requires explicit user confirmation.
3. Calendar changes require a confirmation preview.
4. Automated MYOB reconciliation can only update/delete events mapped in `calendar_event_links` as `MYOB_ROSTER`.
5. Duplicate Gmail messages and roster imports are ignored using source IDs.
6. Automated actions are recorded in activity and audit tables.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Create a Neon PostgreSQL database and set `DATABASE_URL`.
3. Create Google OAuth credentials and configure the callback:
   `http://localhost:3000/api/auth/callback/google`
4. Fill `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `NEXTAUTH_SECRET`.
5. No AI provider key or paid AI subscription is required.
6. Run:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Background scan endpoint

`GET /api/cron/secretary`

Send:

```
Authorization: Bearer <CRON_SECRET>
```

The endpoint processes only new Gmail messages, runs MYOB roster reconciliation, and records meaningful changes.

## Architecture

- Next.js App Router + TypeScript
- React + Tailwind CSS
- FullCalendar
- NextAuth Google OAuth
- Gmail API + Google Calendar API
- Neon PostgreSQL
- Prisma ORM
- Local secretary logic for planning, priorities and follow-up questions
- Zod validation

See `docs/ARCHITECTURE.md` and `docs/SECURITY.md` for implementation details.
