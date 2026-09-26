import { z } from "zod";

export const planRequestSchema = z.object({
  title: z.string().trim().min(1).max(180),
  minutes: z.number().int().min(15).max(90),
  buffer: z.number().int().min(0).max(30),
}).strict();

export const savedPlanSchema = planRequestSchema.extend({
  createdAt: z.string().datetime(),
  timezone: z.string().min(1).max(100),
  sessions: z.array(z.object({ start: z.string().datetime(), end: z.string().datetime() })).min(1).max(6),
});
export type SavedPlan = z.infer<typeof savedPlanSchema>;

export function readSavedPlan(value: unknown): SavedPlan | null {
  const result = savedPlanSchema.safeParse(value);
  return result.success ? result.data : null;
}
