# Zoro Nexus v1.1 — Calendar + Conversation

This release focuses on the two interfaces that should feel most like a personal operating system: time and conversation.

## Calendar v2

- replaces FullCalendar's default toolbar with a native Nexus command deck
- adds Day, 3-day, Week, Month and Agenda modes
- automatically opens Day view on phones
- adds loaded-event, today and next-event signals
- uses a readable 06:00–23:00 scheduling surface
- adds custom event styling by category
- moves event details/editing into a responsive event sheet
- keeps create/update/delete confirmation behaviour

## Zoro Conversation v2

- conversation is now the primary Assistant surface
- local browser conversation persistence for up to 40 recent messages
- explicit New Chat control
- copy action on Zoro responses
- compact Voice Mode controls and live voice-state visualisation
- modern sticky composer with quick prompts
- confirmation previews remain in the conversation flow
- daily intelligence moved to a compact context card
- optional Qwen WebLLM moved to a collapsed Local AI Engine panel
- on mobile, chat appears before secondary intelligence/settings content

No server-side chat history was added. Browser history is a convenience feature and can be cleared with New Chat.
