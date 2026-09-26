# Zoro command center — v0.9.0

The home screen brings together loaded task, email, follow-up and calendar information in a responsive dark command center. It requires the existing Google sign-in. No paid AI provider, new database migration or environment variable is required.

## Try it

1. Open Home and confirm v0.9.0. Use Refresh for a new snapshot.
2. Review Attention radar for overdue work, deadlines today, schedule overlaps and stale inbox scans. Each signal links to the relevant tool.
3. Open Why this matters on a priority to see its source reason. Select Focus on this to use its title in the timer.
4. In Time lab, choose a focus duration and a recovery buffer. The preview fits up to six blocks inside today's calendar gaps, between 09:00 and 18:00 in the app timezone. It never creates events. Use Calendar or the existing assistant confirmation flow to schedule work.
5. Start, pause, resume or reset a focus timer. It uses elapsed wall-clock time, so returning from another app corrects the display. Reloading or leaving Home resets it. There is no background alarm or app blocking.
6. Open Quick commands or press Ctrl/Command K. Type to filter, use Tab to navigate, or Escape to close.

## Data and reliability

Availability requires a complete, valid calendar response. Unavailable, truncated or malformed calendar data suppresses all focus proposals. Calendar snapshots older than five minutes require a refresh. Returning to the foreground triggers a refresh. Other figures describe the loaded snapshot, not an exhaustive account inventory: existing briefing limits still apply.

The radar uses deterministic rules on saved records and today's calendar. It does not predict events or run an autonomous background agent. Existing on-device conversation remains optional under Assistant, with its experimental compatibility checks and explicit download.

## Validation

24 logic/regression tests cover confirmation ownership, calendar planning, context routing, model eligibility, focus-buffer boundaries, missing calendar data, all-day commitments and timezone-aware deadline signals. TypeScript and production build checks are required before merge. Actual iPhone interaction and WebGPU performance still need device validation.
