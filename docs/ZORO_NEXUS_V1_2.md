# Zoro Nexus v1.2 — Proactive Voice + Natural Understanding

## Startup voice

Zoro now attempts a short spoken greeting when a signed-in app session starts. The greeting can include the current top priority and overdue count. A 20-minute cooldown prevents the assistant from repeating itself on every navigation or refresh.

Browsers may block automatic audio or microphone startup until the user interacts with the page. When that happens, Zoro displays a small one-tap activation control.

## Ambient wake word

When enabled, Zoro can listen for the configured wake word while the web app is active. If the wake word is heard outside the Assistant screen, Zoro responds and opens the Assistant. A command spoken immediately after the wake word is passed into the conversation.

This is foreground web-app behavior only. iOS may suspend microphone access when the app is backgrounded, closed or the device is locked.

## Understanding improvements

The deterministic local assistant now normalises common speech-recognition mistakes and understands more conversational wording. Examples include:

- "anything for me?"
- "what I do now?"
- "what can do for me?"
- "check my mails"
- "calender"
- "tommorow"
- "emial"
- "schedual"

Conversation history sent to the secretary engine has been expanded from 12 to 20 recent messages, with a server maximum of 24.

## Settings

Assistant settings now include:

- Speak when the app opens
- Include useful context in the startup greeting
- Hands-free wake word while the app is active
