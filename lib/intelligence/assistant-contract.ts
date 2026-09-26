import { z } from "zod";

const timestamp = z.iso.datetime({ offset: true });
export const pendingActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CREATE_TASK"), title: z.string().trim().min(1).max(240),
    dueAt: timestamp.optional(), priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]),
    category: z.string().max(50), nextAction: z.string().max(1000).optional() }).strict(),
  z.object({ type: z.literal("CREATE_CALENDAR_EVENT"), summary: z.string().trim().min(1).max(240),
    start: timestamp, end: timestamp, category: z.enum(["WORKOUT", "APPOINTMENT", "PERSONAL", "REMINDER"]),
    description: z.string().max(2000).optional() }).strict().refine(a => Date.parse(a.end) > Date.parse(a.start) && Date.parse(a.end) - Date.parse(a.start) <= 86_400_000, "Event must last between 1 second and 24 hours."),
  z.object({ type: z.literal("SYNC_MYOB_ROSTER") }).strict(),
]);
export type PendingAction = z.infer<typeof pendingActionSchema>;

export const reasoningResultSchema = z.object({
  message: z.string().min(1).max(12000),
  suggestedPrompts: z.array(z.string().min(1).max(120)).max(3),
  evidenceIds: z.array(z.string().max(200)).max(8),
  proposedAction: z.object({
    type: z.enum(["CREATE_TASK", "CREATE_CALENDAR_EVENT"]),
    title: z.string().min(1).max(240), start: timestamp.nullable(), end: timestamp.nullable(),
    dueAt: timestamp.nullable(), priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]),
  }).strict().nullable(),
}).strict();

export function toPendingAction(value: z.infer<typeof reasoningResultSchema>["proposedAction"]): PendingAction | null {
  if (!value) return null;
  return pendingActionSchema.parse(value.type === "CREATE_TASK" ? {
    type: value.type, title: value.title, dueAt: value.dueAt ?? undefined,
    priority: value.priority, category: "PERSONAL", nextAction: value.title,
  } : {
    type: value.type, summary: value.title, start: value.start, end: value.end,
    category: "PERSONAL", description: "Prepared by Zoro. Created only after your confirmation.",
  });
}

export const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000).optional(),
  confirmationToken: z.uuid().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) })).max(16).optional(),
}).strict().refine(value => Boolean(value.message) !== Boolean(value.confirmationToken), "Provide a message or a confirmation token.");
