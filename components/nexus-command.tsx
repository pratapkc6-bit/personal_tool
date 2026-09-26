"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarDays,
  Command,
  Inbox,
  ListTodo,
  Mic2,
  PlugZap,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

const commands = [
  { href: "/assistant", title: "Open Zoro", detail: "Voice, reasoning and action previews", Icon: Mic2, group: "AI" },
  { href: "/", title: "Command Center", detail: "Priorities, focus plan and daily signals", Icon: Sparkles, group: "Workspace" },
  { href: "/tasks?action=add", title: "Create mission", detail: "Capture a new task or outcome", Icon: ListTodo, group: "Create" },
  { href: "/calendar", title: "Open timeline", detail: "Review Google Calendar and commitments", Icon: CalendarDays, group: "Workspace" },
  { href: "/inbox?scan=1", title: "Scan intelligence", detail: "Process Gmail into actionable intelligence", Icon: Inbox, group: "Intelligence" },
  { href: "/search", title: "Search everything", detail: "Find tasks, emails and stored work", Icon: Search, group: "Workspace" },
  { href: "/activity", title: "Activity stream", detail: "See what your secretary has done", Icon: Activity, group: "System" },
  { href: "/connections", title: "Connections", detail: "Manage Google access and integrations", Icon: PlugZap, group: "System" },
  { href: "/settings/assistant", title: "Assistant preferences", detail: "Wake word, voice and model settings", Icon: Settings2, group: "System" },
];

export function NexusCommand() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        dialog.current?.showModal();
        window.setTimeout(() => input.current?.focus(), 30);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((item) =>
      `${item.title} ${item.detail} ${item.group}`.toLowerCase().includes(needle)
    );
  }, [query]);

  function open() {
    setQuery("");
    dialog.current?.showModal();
    window.setTimeout(() => input.current?.focus(), 30);
  }

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <button type="button" className="nexus-command-trigger" onClick={open}>
        <Search size={17} />
        <span>Search or run a command</span>
        <kbd><Command size={12} />K</kbd>
      </button>

      <dialog
        ref={dialog}
        className="nexus-palette"
        aria-labelledby="nexus-command-title"
        onClick={(event) => {
          if (event.currentTarget === event.target) close();
        }}
      >
        <div className="nexus-palette-shell">
          <div className="nexus-palette-search">
            <Search size={18} />
            <label className="sr-only" htmlFor="nexus-command-search">Search commands</label>
            <input
              ref={input}
              id="nexus-command-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Where do you want to go?"
              autoComplete="off"
            />
            <button onClick={close} aria-label="Close command palette"><X size={18} /></button>
          </div>

          <div className="nexus-palette-heading">
            <div>
              <p className="nexus-kicker">GLOBAL COMMAND LAYER</p>
              <h2 id="nexus-command-title">Move instantly.</h2>
            </div>
            <span>{filtered.length} commands</span>
          </div>

          <div className="nexus-palette-list">
            {filtered.map(({ href, title, detail, Icon, group }) => (
              <Link href={href} key={href + title} onClick={close} className="nexus-command-item">
                <span className="nexus-command-icon"><Icon size={18} /></span>
                <span className="nexus-command-copy">
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                <span className="nexus-command-group">{group}</span>
              </Link>
            ))}
            {!filtered.length && (
              <div className="nexus-command-empty">No matching command. The machine remains stubbornly literal.</div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
