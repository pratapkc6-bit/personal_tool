# Zoro Nexus v7.0 — 50 Major Changes

This release adds five coherent upgrade packs with 10 concrete changes each.

## 1. Daily Briefing 2.0 (1–10)
1. Added a new Daily Briefing aggregation engine.
2. Added a dedicated /briefing workspace.
3. Added an authenticated /api/briefing endpoint using the new engine.
4. Added a single Next Best Action across approvals, overdue tasks, urgent email, follow-ups, calendar and reminders.
5. Added overdue-task counts and detail rows.
6. Added due-today task counts and detail rows.
7. Added due follow-up counts and detail rows.
8. Added next-24-hour reminder counts and detail rows.
9. Added urgent-email and pending-approval awareness.
10. Added Gmail freshness plus calendar load, conflicts and free-block context to the briefing.

## 2. Waiting Radar (11–20)
11. Added a Waiting Radar classification engine.
12. Added a dedicated /waiting workspace.
13. Added an authenticated /api/waiting endpoint.
14. Added an Overdue follow-up bucket.
15. Added a Due Today follow-up bucket.
16. Added an Upcoming follow-up bucket.
17. Added an Unscheduled follow-up bucket for items with no next date.
18. Added a Longest Waiting view using days since last update.
19. Added one-tap follow-up completion.
20. Added one-tap follow-up postponing to tomorrow or three days later.

## 3. Calendar Intelligence (21–30)
21. Added a reusable calendar-intelligence engine.
22. Added active-event detection.
23. Added next-event detection.
24. Added schedule-overlap/conflict detection.
25. Added free-block detection for gaps of at least 30 minutes.
26. Added short-gap detection for sub-30-minute windows.
27. Added scheduled-load scoring for the working day.
28. Added merged busy-minute calculation so overlaps are not double-counted.
29. Added live Timeline cards for load, conflicts and best free block.
30. Added an inline conflict warning showing the overlapping event names.

## 4. Intel Triage (31–40)
31. Added a reusable Inbox Triage engine.
32. Added Due in 24 Hours email triage.
33. Added Security email triage.
34. Added Waiting email triage.
35. Added Aging Action triage for action items older than 72 hours.
36. Added actionable-email counts inside the triage engine.
37. Added urgent-email counts inside the triage engine.
38. Added sender hotspot analysis to show who generates the most action.
39. Added intelligence freshness age and fresh/stale status.
40. Added new Inbox filters and House Five-style triage controls for all of the above.

## 5. Resilience & Navigation (41–50)
41. Added a global offline connectivity banner.
42. Added an automatic Connection Restored banner.
43. Added clear offline guidance explaining that cached/read-only screens remain usable while live actions pause.
44. Added a global error recovery page with Retry.
45. Added a branded global loading state.
46. Added a branded 404 recovery page.
47. Added Daily Briefing to the desktop workspace navigation.
48. Added Waiting Radar to the desktop workspace navigation.
49. Added Daily Briefing to the global command palette.
50. Added Waiting Radar to the global command palette.

No destructive database migration is required for v7. Existing Gmail, Calendar, Tasks, Reminders, Zoro Core, voice, alerts, Smart Capture and House Five bright-mode functionality remain intact.
