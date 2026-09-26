# Security model

## Prompt injection

Email bodies are untrusted data. No email instruction is allowed to change app configuration, send money, send email, delete records, change permissions or override the user's intent.

The AI assistant receives structured email summaries rather than raw email bodies for general briefing answers.

## Gmail

The app requests Gmail read and compose permissions. Draft creation is separate from sending. The send endpoint requires `confirmed: true` from an explicit user action.

## Calendar

Manual create/update/delete requests require a confirmation flag and are previewed in the UI first.

Automatic MYOB processing is more restrictive: it can only mutate Google events with a corresponding `CalendarEventLink` whose `sourceType` is `MYOB_ROSTER`.

## Database

Every meaningful automated mutation records an audit entry with source, action, previous/new state where relevant, timestamp and result.

## Scheduled endpoint

`/api/cron/secretary` is protected by `CRON_SECRET`. Do not expose this secret to client-side code.

## Production hardening checklist

- keep all OAuth and API secrets server-side
- enable HTTPS only
- restrict Google OAuth redirect URIs
- rotate `NEXTAUTH_SECRET` and `CRON_SECRET` if exposed
- use a dedicated Google Cloud project
- verify Google Pub/Sub push identity before enabling Phase 6
- apply Neon least-privilege credentials for production
