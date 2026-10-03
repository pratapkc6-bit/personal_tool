import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { normalizeAssistantInput } from "@/lib/intelligence/local-assistant";

const NOTES_KEY = "assistant_notes_v1";

export type AssistantNote = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function cleanNotes(value: unknown): AssistantNote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.title !== "string" ||
      typeof record.content !== "string" ||
      typeof record.createdAt !== "string" ||
      typeof record.updatedAt !== "string"
    ) return [];
    return [{
      id: record.id,
      title: record.title,
      content: record.content,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }];
  });
}

export async function loadAssistantNotes(userId: string) {
  const setting = await db.setting.findUnique({
    where: { userId_key: { userId, key: NOTES_KEY } },
  });
  return cleanNotes(setting?.value);
}

async function saveAssistantNotes(userId: string, notes: AssistantNote[]) {
  await db.setting.upsert({
    where: { userId_key: { userId, key: NOTES_KEY } },
    create: { userId, key: NOTES_KEY, value: notes },
    update: { value: notes },
  });
}

export async function createAssistantNote(
  userId: string,
  input: { title: string; content: string },
) {
  const notes = await loadAssistantNotes(userId);
  const now = new Date().toISOString();
  const note: AssistantNote = {
    id: randomUUID(),
    title: input.title.trim().slice(0, 180),
    content: input.content.trim().slice(0, 10000),
    createdAt: now,
    updatedAt: now,
  };
  await saveAssistantNotes(userId, [note, ...notes].slice(0, 250));
  return note;
}

export async function deleteAssistantNote(userId: string, noteId: string) {
  const notes = await loadAssistantNotes(userId);
  const note = notes.find((item) => item.id === noteId) || null;
  if (!note) return null;
  await saveAssistantNotes(userId, notes.filter((item) => item.id !== noteId));
  return note;
}

export function noteCreatePreview(message: string) {
  const text = message.trim();
  const understood = normalizeAssistantInput(text);
  const intent = /\b(?:take|make|create|save|write|add|set)\s+(?:a\s+)?note\b|\bnote\s+(?:down|this|to self)\b|\bremember\s+(?:this|that)\b/i;
  if (!intent.test(understood)) return null;

  const content = text
    .replace(/^(?:please\s+)?(?:take|make|create|save|write|add|set)\s+(?:a\s+)?note\s*(?:that|saying|about|of|:|-)?\s*/i, "")
    .replace(/^(?:please\s+)?note\s+(?:down|this|to self)\s*(?:that|:|-)?\s*/i, "")
    .replace(/^(?:please\s+)?remember\s+(?:this|that)\s*(?:that|:|-)?\s*/i, "")
    .trim();

  if (!content || /^(?:a|the)?\s*note$/i.test(content)) {
    return { needsContent: true as const };
  }

  const first = content.split(/[.!?\n]/)[0]?.trim() || content;
  const title = (first.length > 70 ? first.slice(0, 67) + "…" : first) || "Note";
  return {
    needsContent: false as const,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    content,
  };
}

export function isNoteListIntent(message: string) {
  const understood = normalizeAssistantInput(message);
  return /\b(?:show|list|read|check|what|which|find|search)\b.*\bnotes?\b/i.test(understood)
    && !/\b(?:delete|remove|create|make|take|save|write|add)\b/i.test(understood);
}

export function noteSearchTerms(message: string) {
  const understood = normalizeAssistantInput(message);
  const match = /\b(?:about|for|containing|with)\s+(.+)$/i.exec(understood);
  return match?.[1]?.trim() || "";
}

export function noteMatchScore(note: AssistantNote, text: string) {
  const q = normalizeAssistantInput(text);
  const title = normalizeAssistantInput(note.title);
  const content = normalizeAssistantInput(note.content);
  let score = 0;
  if (title && q.includes(title)) score += 100;
  for (const token of q.split(/\s+/).filter((item) => item.length > 2)) {
    if (title.includes(token)) score += 10;
    else if (content.includes(token)) score += 3;
  }
  return score;
}
