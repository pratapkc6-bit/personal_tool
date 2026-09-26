# Zoro v0.7.1 — local intelligence

The paid AI integration introduced in v0.7.0 has been removed. No model provider key or paid AI subscription is required, and no assistant data is sent to an external model service.

## Available features

- Daily command briefing with the next priority, overdue items, focus windows and schedule conflicts.
- Local day planning, priorities, deadlines, email-action summaries and contextual follow-up questions.
- Existing browser voice mode and editable voice preferences.
- Task and calendar previews with user-scoped, expiring, single-use confirmations.
- Explicit Calendar availability and Gmail scan timestamps.

## Limits

This is a rule-based secretary, not a general-purpose conversational language model. Planning covers today/tomorrow between 09:00 and 18:00 using the primary Google Calendar. Chat context lasts for the current page session. Voice works while the page is active. Existing hosting, database and Google connections still apply; removing paid AI does not change those services or their pricing.

The personal brief and AI-mode controls were removed because they only supported the paid model. Previously saved settings are not deleted, but those fields are ignored.

## Validation

Run npm test, npm run typecheck and npm run build. Tests cover scheduling, conversational routing, request validation, briefing accuracy, confirmation ownership, expiry and concurrency. Local browser verification was blocked by automatic approval review in this environment.
