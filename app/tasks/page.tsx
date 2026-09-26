import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskBoard } from "@/components/task-board";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const tasks = session?.user?.id ? await db.task.findMany({
    where: { userId: session.user.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  }) : [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">MISSION CONTROL</p>
        <h1 className="text-2xl font-bold tracking-tight">Your missions</h1>
        <p className="mt-1 text-sm text-slate-600">Capture an outcome. Choose the next step. Move it forward.</p>
      </div>
      <TaskBoard initialShowAdd={params.action === "add"} initialTasks={tasks.map((task) => ({ ...task, dueAt: task.dueAt?.toISOString() || null }))} />
    </div>
  );
}

