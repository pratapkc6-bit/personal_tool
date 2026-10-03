import { z } from "zod";

const timestamp = z.iso.datetime({ offset: true });
const emailFields = {
  to: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(300),
  message: z.string().trim().min(1).max(50000),
};

export const pendingActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("CREATE_TASK"),
    title: z.string().trim().min(1).max(240),
    dueAt: timestamp.optional(),
    priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]),
    category: z.string().max(50),
    nextAction: z.string().max(1000).optional(),
  }).strict(),
  z.object({
    type: z.literal("CREATE_CALENDAR_EVENT"),
    summary: z.string().trim().min(1).max(240),
    start: timestamp,
    end: timestamp,
    category: z.enum(["WORKOUT", "APPOINTMENT", "PERSONAL", "REMINDER"]),
    description: z.string().max(2000).optional(),
  }).strict().refine(
    (a) => Date.parse(a.end) > Date.parse(a.start) && Date.parse(a.end) - Date.parse(a.start) <= 86_400_000,
    "Event must last between 1 second and 24 hours.",
  ),
  z.object({
    type: z.literal("CREATE_REMINDER"),
    title: z.string().trim().min(1).max(180),
    remindAt: timestamp,
    mode: z.enum(["REMINDER", "ALARM"]),
    recurrence: z.enum(["NONE", "DAILY"]),
    recurrenceTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    timezone: z.string().min(1).max(80),
    ringSeconds: z.number().int().min(0).max(10),
  }).strict(),
  z.object({ type: z.literal("CREATE_EMAIL_DRAFT"), ...emailFields }).strict(),
  z.object({ type: z.literal("SEND_EMAIL"), ...emailFields }).strict(),
  z.object({ type: z.literal("SYNC_MYOB_ROSTER") }).strict(),
]);

export type PendingAction = z.infer<typeof pendingActionSchema>;

export const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000).optional(),
  confirmationToken: z.uuid().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) })).max(24).optional(),
}).strict().refine(
  (value) => Boolean(value.message) !== Boolean(value.confirmationToken),
  "Provide a message or a confirmation token.",
);
