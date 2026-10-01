# Zoro Nexus v6.0 — 100-Point Upgrade

This manifest records the 100 concrete changes shipped in the v6.0 Command OS release.

## 1. Smart Capture (1–10)
1. Added an optional natural-language capture field.
2. Added an authenticated capture-interpretation API.
3. Added chrono-node date and time extraction.
4. Added forward-date parsing for phrases such as “tomorrow”.
5. Added reminder-intent detection from natural language.
6. Added daily recurrence detection.
7. Added priority inference for urgent, high and low priority language.
8. Added automatic task category inference.
9. Added task due-date capture.
10. Added interpretation confidence and explanation feedback.

## 2. Capture Workflow (11–20)
11. Task and Reminder remain available as explicit capture tabs.
12. Natural-language interpretation can switch the suggested capture type.
13. Interpreted task titles are cleaned of reminder/date phrases.
14. Smart Capture now exposes task category selection.
15. Smart Capture now exposes an optional task due date.
16. Daily reminders preserve their recurrence time.
17. Saved tasks identify Smart Capture as their source.
18. Capture state resets safely after a successful save.
19. Other UI components can open Capture through a global event.
20. Capture errors now surface provider/API messages when available.

## 3. Global Command Layer (21–30)
21. Added direct “Capture task” command.
22. Added direct “Create reminder” command.
23. Added Today command.
24. Added Data Hub command.
25. Added Core Control command.
26. Added Alerts & Reminders command.
27. Added System Health command.
28. Added About Zoro command.
29. Added keyword aliases for command discovery.
30. Expanded the palette to cover the primary Zoro workspaces.

## 4. Command Keyboard UX (31–40)
31. Added Arrow Down navigation.
32. Added Arrow Up navigation.
33. Added Enter-to-run for the selected command.
34. Added Escape-to-close behavior.
35. Added active command highlighting.
36. Added mouse-hover synchronization with keyboard selection.
37. Added keyboard-hint footer.
38. Command selection resets when the query changes.
39. Direct capture commands open Smart Capture without navigation.
40. Existing Cmd/Ctrl+K access is preserved.

## 5. Universal Search (41–50)
41. Email search now includes “what happened” intelligence.
42. Email search now includes recommended actions.
43. Task search now includes next actions.
44. Follow-up search now includes expected responses.
45. Added reminder search.
46. Added pending/action proposal search.
47. Added Personal Context Graph search.
48. Calendar search remains included.
49. Added a unified match count.
50. Search now spans seven Zoro data groups.

## 6. Search Experience (51–60)
51. Added a one-tap clear-search control.
52. Added explicit search error messaging.
53. Added no-store fetching for fresh results.
54. Added per-group destination links.
55. Added per-group result limits for readable pages.
56. Added reminder date/time rendering.
57. Added approval action-type/status rendering.
58. Added memory summary/kind fallbacks.
59. Added responsive professional search cards.
60. Updated Search page copy to describe the full index.

## 7. System Health (61–70)
61. Added Zoro Core storage health verification.
62. Added Personal Context Graph query verification.
63. Added action-proposal storage verification.
64. Added runtime timezone verification.
65. Added Intelligence Gateway capability checks.
66. Added Google Places configuration health.
67. Added a compact health score.
68. Added separate attention and unavailable counts.
69. Redesigned health checks into state-aware cards.
70. Added direct navigation to Data Hub from diagnostics.

## 8. PWA & Installed App (71–80)
71. Updated installed-app name to Zoro Nexus.
72. Simplified short name to Zoro.
73. Updated the manifest description for current capabilities.
74. Changed PWA background to House Five ivory.
75. Changed PWA theme color to burgundy.
76. Added Today shortcut.
77. Added Ask Zoro shortcut.
78. Added Missions shortcut.
79. Added Reminders shortcut.
80. Added Intel/Data Hub shortcut.

## 9. Home & Assistant (81–90)
81. Added a time-aware morning/afternoon/evening Home greeting.
82. Added a stale-snapshot warning pill.
83. Added a unified `zoro:data-changed` event for secretary-wide refreshes.
84. Smart Capture now broadcasts the unified refresh event after successful writes.
85. Added whole-conversation copy in Zoro AI.
86. Added a visible copy-chat state after copying.
87. Added “What changed since yesterday?” quick prompt.
88. Added “Show what I’m waiting for” quick prompt.
89. Added “Check my next appointment” quick prompt.
90. Added “Summarize my urgent email” as a new assistant quick prompt.

## 10. Accessibility, Mobile & Resilience (91–100)
91. Added global reduced-motion handling.
92. Added mobile safe-area support for the bottom dock.
93. Added touch-action optimization for interactive controls.
94. Added consistent disabled-control feedback.
95. Added a high-contrast House Five focus ring.
96. Added dialog viewport-height protection.
97. Added dialog overscroll containment.
98. Added sticky-header scroll padding.
99. Added balanced page-heading wrapping.
100. Added mobile single-column layouts for Search, Health and Smart Capture.

The release intentionally avoids destructive database migrations. Existing Gmail, Calendar, Tasks, Reminders, Zoro Core, alerts, voice and House Five bright-mode behavior remain intact.
