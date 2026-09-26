# Zoro Voice Mode

## What it does

Zoro adds voice interaction to Pratap Personal Secretary without requiring a generative-AI API.

1. Open Assistant.
2. Tap **Start Voice Mode**.
3. Grant microphone permission.
4. While the Assistant screen remains active, say **Zoro**.
5. Zoro speaks **How can I help you?**
6. Speak the request.
7. The existing local intelligence engine processes the request and Zoro speaks the answer.

Calendar, task and MYOB roster changes retain their confirmation gate.

## Browser limitation

A normal web app cannot keep a permanent microphone listener running after the browser/PWA is suspended or closed, and it cannot draw a floating control over unrelated iOS apps.

The floating Zoro launcher included in this release is available throughout Pratap Personal Secretary itself.

## iPhone Home Screen

The app now exposes a web-app manifest and Apple standalone metadata. In Safari, use **Share → Add to Home Screen** to launch Zoro in a standalone app-style window.

iOS may suspend microphone recognition when the app is backgrounded. Keep the Zoro Assistant visible for wake-word listening.

## Future native option

A native iOS wrapper could add deeper OS integrations such as App Intents, Siri Shortcuts and notifications, but third-party apps still cannot replace Apple's system wake phrase with a permanent custom background wake word.
