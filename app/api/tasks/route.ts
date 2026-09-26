import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, activity } from "@/lib/audit";

const schema = z.object({
  title: z.string().min(1).max(180),
  category: z.string().min(1).max(80).default("PERSONAL"),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  dueAt: z.string().datetime().nullable().optional(),
  source: z.string().default("User"),
  nextAction: z.string().max(1000).optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await db.task.findMany({ where: { userId: session.user.id }, orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }] }));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const task = await db.task.create({
      data: {
        userId: session.user.id,
        title: input.title,
        category: input.category,
        priority: input.priority,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        source: input.source,
        nextAction: input.nextAction,
        notes: input.notes,
      },
    });
    await audit({ userId: session.user.id, action: "TASK_CREATED", source: input.source, sourceRef: task.id, newState: task, result: "SUCCESS" });
    await activity({ userId: session.user.id, type: "TASK", summary: `Task created: ${task.title}`, details: { taskId: task.id } });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create task" }, { status: 400 });
  }
}
