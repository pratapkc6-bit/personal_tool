import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskBoard } from "@/components/task-board";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  const tasks = session?.user?.id ? await db.task.findMany({
    where: { userId: session.user.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  }) : [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">SECRETARY TASK SYSTEM</p>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-slate-600">Open, waiting, completed and no-longer-relevant work in one place.</p>
      </div>
      <TaskBoard initialTasks={tasks.map((task) => ({ ...task, dueAt: task.dueAt?.toISOString() || null }))} />
    </div>
  );
}
