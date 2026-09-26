import { getServerSession } from "next-auth";
import { Crosshair } from "lucide-react";
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
    <div className="nexus-page">
      <div className="nexus-page-heading">
        <div className="nexus-page-icon"><Crosshair size={22} /></div>
        <div className="nexus-page-title">
          <p className="nexus-kicker">MISSION CONTROL</p>
          <h1>Turn intent into motion</h1>
          <p>Capture outcomes, define the next physical step and keep only the work that matters visible.</p>
        </div>
      </div>
      <TaskBoard initialShowAdd={params.action === "add"} initialTasks={tasks.map((task) => ({ ...task, dueAt: task.dueAt?.toISOString() || null }))} />
    </div>
  );
}
