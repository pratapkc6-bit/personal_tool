"use client";

import { useState } from "react";

type Task = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  dueAt: string | null;
  nextAction: string | null;
};

export function TaskBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueAt, setDueAt] = useState("");

  async function createTask() {
    if (!title.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category: "PERSONAL",
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        source: "User",
        nextAction: title,
      }),
    });
    if (!res.ok) return;
    const task = await res.json();
    setTasks((current) => [task, ...current]);
    setTitle("");
    setDueAt("");
    setShowAdd(false);
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setTasks((current) => current.map((task) => task.id === id ? updated : task));
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setShowAdd((v) => !v)} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">+ Add Task</button>

      {showAdd && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="rounded-xl border border-slate-300 px-3 py-3 sm:col-span-2" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-3">
            <option>URGENT</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
          </select>
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-3" />
          <button onClick={createTask} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white sm:col-span-2">Create task</button>
        </div>
      )}

      {tasks.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No tasks yet.</div> : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <article key={task.id} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-card ${task.status === "COMPLETED" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className={`font-semibold ${task.status === "COMPLETED" ? "line-through" : ""}`}>{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{task.nextAction || task.category}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{task.priority}</span>
              </div>
              {task.dueAt && <p className="mt-2 text-xs text-slate-500">Due {new Date(task.dueAt).toLocaleString("en-AU")}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {task.status !== "COMPLETED" && <button onClick={() => setStatus(task.id, "COMPLETED")} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Complete</button>}
                {task.status === "OPEN" && <button onClick={() => setStatus(task.id, "WAITING")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Waiting</button>}
                {task.status !== "OPEN" && task.status !== "COMPLETED" && <button onClick={() => setStatus(task.id, "OPEN")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Reopen</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
