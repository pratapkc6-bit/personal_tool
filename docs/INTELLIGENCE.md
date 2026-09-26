# Pratap Personal Secretary v0.4.0 Local Intelligence

## Goal

Make the assistant useful without sending private Gmail or Calendar content to an external generative-AI API.

## What changed

### Conversational intent engine

The assistant now distinguishes capabilities, briefings, priorities, Gmail, deadlines, follow-ups, Calendar, security alerts and priority explanations.

Short follow-up messages can inherit the topic from recent chat history.

### Context-aware planning

The assistant combines:

- actionable Gmail intelligence
- detected deadlines
- open tasks
- waiting/follow-up items
- the next 7 days of Google Calendar

It can answer questions such as:

- What should I do now?
- What is important today?
- What can you do?
- Am I free tomorrow?
- Which emails need action?
- What deadlines are coming?
- Why is the second item urgent?

### Duplicate suppression

Repeated alerts with the same subject are collapsed for priority ranking. The Inbox still retains the underlying records, but repeated sign-in alerts no longer consume every Top 3 position.

### Conversation context

The web chat sends a small rolling history to the local intelligence engine so short follow-up questions can preserve the previous topic. The history is processed inside the application and is not sent to an external AI service.

### Safety

- Gmail text remains untrusted input.
- Read-only reasoning can run directly.
- Calendar writes, task writes and MYOB roster changes require confirmation.
- No external generative-AI API is required for assistant answers.

## External AI

A model API can still be added later behind a provider interface, but v0.4.0 intentionally does not require OpenAI, Gemini or another generative-AI service for Chief-of-Staff reasoning.

## Portfolio explanation

> Built a privacy-conscious personal Chief-of-Staff web application that integrates Google OAuth, Gmail and Calendar APIs, PostgreSQL/Neon, deadline extraction, priority scoring, duplicate suppression, conversational intent routing, local schedule reasoning and confirmation-gated automation without requiring a paid generative-AI API.
