# Pratap Personal Secretary v0.3.0 Intelligence

## Purpose

The intelligence layer turns Gmail, Calendar, tasks and follow-ups into prioritised decisions instead of separate data screens.

## Architecture

- `deadline-extractor.ts`: extracts explicit and relative deadlines from email text.
- `email-intelligence.ts`: combines classification, deadline detection and priority elevation.
- `priority-engine.ts`: scores tasks, action emails and follow-ups using urgency, deadline proximity and age.
- `context-builder.ts`: builds a safe structured context for the Assistant using stored intelligence plus live Calendar data.
- `secretary.ts`: produces cross-source Top 3 priorities and briefing metrics.

## Safety

Email bodies are treated as untrusted input. They may contribute to structured classification and deadline detection, but they never directly execute an action.

Read-only Gmail scans can run automatically when stored intelligence is stale. Calendar writes, task writes and MYOB roster reconciliation require explicit user confirmation.

## Cost control

The core intelligence works without a paid AI model. If no `OPENAI_API_KEY` exists, the Assistant uses deterministic reasoning over structured Gmail, task, follow-up and Calendar context.

The dashboard refreshes Gmail only when the last scan is older than 30 minutes, avoiding an API call on every page view.

## Portfolio talking point

> Built a personal Chief-of-Staff web application integrating Google OAuth, Gmail and Calendar APIs, PostgreSQL/Neon, automated email classification, deadline extraction, urgency scoring, cross-source prioritisation, controlled background refresh and a context-aware assistant with confirmation gates for write actions.
