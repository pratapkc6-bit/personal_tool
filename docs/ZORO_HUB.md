# Zoro Hub — v0.10.0

## A shared workspace

The app now uses black surfaces, orange accents, a two-part Zoro Hub wordmark, compact navigation and cards across all tools. Your routes and existing data remain compatible. The installed web app starts on the daily feed. No paid AI key, Mac, schema migration or additional environment variable is needed.

- **For you:** daily priorities, attention signals, calendar trajectory and focus planning.
- **Capture:** accessible from every screen; save a task with a priority and a clear first step.
- **Missions:** search loaded tasks, filter open/waiting/completed/overdue work, complete or reopen tasks, and edit the next action. The add-task deep link now opens the form.
- **Intelligence:** filter loaded email records by action required, urgency or detected deadline, and search sender, subject or recommended action.
- **Timeline:** existing Calendar views and confirmed changes, in the shared dark theme.
- **Setup:** Google access status, inbox briefing setup and optional on-device AI entry points.

## Account-saved focus plans

Select a priority on Home, adjust focus length and recovery time, then choose **Save this focus plan**. The server reads your calendar again and calculates up to six sessions inside verified gaps. Incomplete calendars or gaps that cannot fit a session are rejected. Supplied client times are never accepted.

A plan persists in your account's existing settings record. **Replace saved plan** overwrites that one record; **Clear saved plan** removes it. Saved times are suggestions and are labelled as such: they do not reserve Google Calendar time, reschedule events, or keep updating automatically. Review your calendar before using an old plan.

The focus timer remains a page-session timer, with no promised background alarm. On-device AI remains a small experimental browser model, explicitly enabled by the user. No autonomous messages, payments or third-party writes have been added.

## Verification

29 regression tests include authenticated plan access, account-bound reads/deletes/writes, rejection of supplied times and invalid parameters, incomplete calendars, and recalculation of valid sessions. TypeScript and production builds are checked before release. Full signed-in iPhone and on-device generation verification still requires the real device.
