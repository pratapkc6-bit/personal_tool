import { db } from "@/lib/db";

export const ASSISTANT_SETTINGS_KEY = "assistant_preferences";

export type AssistantSettings = {
  wakeWord: string;
  wakeResponse: string;
  spokenReplies: boolean;
  keepListening: boolean;
  language: "en-AU" | "en-US" | "en-GB" | "en-IN";
  speechRate: number;
  autoGreeting: boolean;
  proactiveGreeting: boolean;
  handsFreeWakeWord: boolean;
};

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  wakeWord: "Zoro",
  wakeResponse: "How can I help you?",
  spokenReplies: true,
  keepListening: true,
  language: "en-AU",
  speechRate: 1,
  autoGreeting: true,
  proactiveGreeting: true,
  handsFreeWakeWord: true,
};

const supportedLanguages = new Set<AssistantSettings["language"]>([
  "en-AU",
  "en-US",
  "en-GB",
  "en-IN",
]);

function cleanWakeWord(value: unknown) {
  if (typeof value !== "string") return DEFAULT_ASSISTANT_SETTINGS.wakeWord;
  const cleaned = value
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  return cleaned || DEFAULT_ASSISTANT_SETTINGS.wakeWord;
}

function cleanWakeResponse(value: unknown) {
  if (typeof value !== "string") return DEFAULT_ASSISTANT_SETTINGS.wakeResponse;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, 100);
  return cleaned || DEFAULT_ASSISTANT_SETTINGS.wakeResponse;
}

export function normaliseAssistantSettings(value: unknown): AssistantSettings {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  const language = supportedLanguages.has(input.language as AssistantSettings["language"])
    ? input.language as AssistantSettings["language"]
    : DEFAULT_ASSISTANT_SETTINGS.language;

  const rawRate = typeof input.speechRate === "number"
    ? input.speechRate
    : Number(input.speechRate);
  const speechRate = Number.isFinite(rawRate)
    ? Math.min(1.25, Math.max(0.75, Math.round(rawRate * 20) / 20))
    : DEFAULT_ASSISTANT_SETTINGS.speechRate;

  return {
    wakeWord: cleanWakeWord(input.wakeWord),
    wakeResponse: cleanWakeResponse(input.wakeResponse),
    spokenReplies: typeof input.spokenReplies === "boolean"
      ? input.spokenReplies
      : DEFAULT_ASSISTANT_SETTINGS.spokenReplies,
    keepListening: typeof input.keepListening === "boolean"
      ? input.keepListening
      : DEFAULT_ASSISTANT_SETTINGS.keepListening,
    language,
    speechRate,
    autoGreeting: typeof input.autoGreeting === "boolean"
      ? input.autoGreeting
      : DEFAULT_ASSISTANT_SETTINGS.autoGreeting,
    proactiveGreeting: typeof input.proactiveGreeting === "boolean"
      ? input.proactiveGreeting
      : DEFAULT_ASSISTANT_SETTINGS.proactiveGreeting,
    handsFreeWakeWord: typeof input.handsFreeWakeWord === "boolean"
      ? input.handsFreeWakeWord
      : DEFAULT_ASSISTANT_SETTINGS.handsFreeWakeWord,
  };
}

export async function loadAssistantSettings(userId: string) {
  const setting = await db.setting.findUnique({
    where: {
      userId_key: {
        userId,
        key: ASSISTANT_SETTINGS_KEY,
      },
    },
  });

  return normaliseAssistantSettings(setting?.value);
}

export async function saveAssistantSettings(userId: string, value: unknown) {
  const settings = normaliseAssistantSettings(value);

  await db.setting.upsert({
    where: {
      userId_key: {
        userId,
        key: ASSISTANT_SETTINGS_KEY,
      },
    },
    update: { value: settings },
    create: {
      userId,
      key: ASSISTANT_SETTINGS_KEY,
      value: settings,
    },
  });

  return settings;
}
