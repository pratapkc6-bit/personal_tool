# Assistant Settings

Assistant preferences are stored per user in the existing Prisma `Setting` table under the key `assistant_preferences`. No schema migration is required.

## Available settings

- **Wake word / activation phrase**: default `Zoro`; supports a short custom word or phrase.
- **Wake response**: default `How can I help you?`
- **Language**: Australian, US, UK or Indian English for browser recognition/speech.
- **Speech rate**: 0.75× to 1.25×.
- **Spoken replies**: enable/disable text-to-speech responses.
- **Keep listening**: return to wake-word listening after an answer.

## Route

Open:

`/settings/assistant`

The Assistant page also exposes a Settings button.

## Limitations

The custom activation phrase is matched by browser speech recognition while the Assistant page remains active. iOS can suspend microphone access when the browser or installed web app is backgrounded or closed.
