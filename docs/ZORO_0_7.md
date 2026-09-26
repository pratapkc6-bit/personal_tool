# Zoro v0.7.0

## What users see

The Assistant page opens with a command briefing: the highest ranked next action, overdue items, schedule conflicts, and available focus time. It reports the time of its snapshot and the last Gmail scan. Refresh reloads stored secretary data and Calendar; it does not silently scan Gmail or run a background agent.

Local mode supports the existing deterministic secretary functions. AI reasoning adds natural conversation, goal breakdowns, decision support, source links to relevant app records, follow-up prompts, and task/event proposals. Answers are labelled by the engine that actually produced them. If the provider fails, the interface explicitly reports the local fallback.

## Enable AI reasoning

1. Set `OPENAI_API_KEY` in the server deployment environment. Never use a `NEXT_PUBLIC_` variable for this secret.
2. Optionally set `OPENAI_MODEL`; the default is `gpt-5.4-mini`.
3. Deploy v0.7.0, open Assistant Settings, enable AI reasoning and save.
4. Add goals, preferences and constraints to the personal brief. It persists in the user's existing settings record and can be edited or cleared.

AI is opt-in. Each AI answer sends the message, bounded recent conversation, personal brief, and structured secretary summaries to OpenAI. Raw inbox bodies, OAuth tokens and API credentials are not included in model input. Responses use `store: false`; this is not a promise of zero retention across all provider systems. API usage is billable. No live key was required for the mocked regression tests.

## Try it

- “I have an interview next week and a busy roster. Help me prepare without overloading my day.”
- “What am I overlooking? Use my deadlines and follow-ups.”
- “Turn that next step into a task.”
- “Create a 45-minute interview practice event tomorrow at 3 pm.”
- “Explain why you put that first.”

The AI can ask clarifying questions before proposing an action. A preview has the exact title, date/time and priority. Confirmation consumes a user-scoped token once, expires after ten minutes, and cannot be replaced by a client-supplied action. A new chat request invalidates the old preview. If a network error occurs during execution, users should inspect Tasks/Calendar before retrying.

## Limits

- No autonomous email sending, background listening, web browsing, or edits to existing events through the model.
- Personal brief is explicit memory; conversation history is bounded and only stays in the current page session.
- Local planning uses 09:00–18:00 and supports today/tomorrow. AI may discuss broader plans, but it sees only the bounded secretary snapshot and must not invent availability.
- The live Google account and billable model response quality require deployment credentials to validate end-to-end.

## Validation

Run `npm test`, `npm run typecheck`, and `npm run build` on Node 22. Tests cover schedule boundaries, context routing, AI failure handling, structured proposals, evidence filtering, confirmation ownership, expiry and concurrency. Browser checks use synthetic API responses for authenticated interactions; no real emails or calendar entries are created.

API implementation references: [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini).
