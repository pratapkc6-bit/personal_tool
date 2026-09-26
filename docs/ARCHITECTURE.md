# Architecture

## Core loop

OBSERVE → UNDERSTAND → PRIORITISE → ACT → RECORD → FOLLOW UP

## Sources of truth

- Google Calendar is the calendar source of truth.
- Gmail remains the email source of truth.
- Neon stores secretary intelligence, tasks, follow-ups, source links, activity and audit history.
- MYOB calendar ownership is represented by `CalendarEventLink`, never inferred from event title alone.

## Main modules

- `lib/google.ts`: authenticated Google clients
- `lib/gmail-scan.ts`: new-message dedupe, classification and notification creation
- `lib/roster-parser.ts`: deterministic roster extraction
- `lib/roster-sync.ts`: source-linked Google Calendar reconciliation
- `lib/secretary.ts`: briefing aggregation
- `app/api/assistant`: natural-language secretary interface with confirmation-gated writes
- `app/api/cron/secretary`: scheduled background processing

## Data flow

1. Gmail scan gets recent messages.
2. Existing Gmail message IDs are skipped.
3. New messages are classified and stored as intelligence, not blindly acted on.
4. MYOB sync finds a verified MYOB roster email, parses structured shifts and compares with the prior imported roster.
5. Work events are created/updated/deleted only through stored MYOB source links.
6. Meaningful operations create activity records and audit logs.
7. Dashboard and assistant consume structured data rather than repeatedly re-reading every source.
