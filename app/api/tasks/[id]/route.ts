import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, activity } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["OPEN", "WAITING", "COMPLETED", "NO_LONGER_RELEVANT"]).optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  nextAction: z.string().max(1000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const existing = await db.task.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const input = schema.parse(await request.json());
    const updated = await db.task.update({
      where: { id },
      data: {
        status: input.status,
        priority: input.priority,
        dueAt: input.dueAt === null ? null : input.dueAt ? new Date(input.dueAt) : undefined,
        nextAction: input.nextAction,
        notes: input.notes,
      },
    });
    await audit({ userId: session.user.id, action: "TASK_UPDATED", source: "User", sourceRef: id, previousState: existing, newState: updated, result: "SUCCESS" });
    await activity({ userId: session.user.id, type: "TASK", summary: `Task updated: ${updated.title}`, details: { taskId: id, status: updated.status } });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update task" }, { status: 400 });
  }
}
