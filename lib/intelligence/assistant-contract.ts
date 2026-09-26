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

export const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000).optional(),
  confirmationToken: z.uuid().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) })).max(16).optional(),
}).strict().refine(value => Boolean(value.message) !== Boolean(value.confirmationToken), "Provide a message or a confirmation token.");
