"use client";

import { useState } from "react";
import type { AssistantSettings } from "@/lib/assistant-settings";

const languages: Array<{ value: AssistantSettings["language"]; label: string }> = [
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-IN", label: "English (India)" },
];

export function AssistantSettingsForm({
  initialSettings,
  defaults,
}: {
  initialSettings: AssistantSettings;
  defaults: AssistantSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(next = settings) {
    setSaving(true);
    setStatus("Saving…");

    try {
      const response = await fetch("/api/assistant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "Could not save settings.");

      setSettings(data.settings);
      setStatus(`Saved. Say “${data.settings.wakeWord}” to wake the assistant.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSettings(defaults);
    await save(defaults);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div>
          <p className="text-sm font-semibold">Wake word</p>
          <p className="mt-1 text-sm text-slate-500">
            This is the word or short phrase the Assistant listens for while Voice Mode is active.
          </p>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activation phrase</span>
          <input
            value={settings.wakeWord}
            onChange={(event) => setSettings((current) => ({ ...current, wakeWord: event.target.value }))}
            placeholder="Zoro"
            maxLength={24}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </label>

        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          Example: change it to <strong>Jarvis</strong>, <strong>Hey Zoro</strong>, or another short phrase.
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-sm font-semibold">Voice response</p>
        <p className="mt-1 text-sm text-slate-500">What the Assistant says after it hears the wake word.</p>

        <input
          value={settings.wakeResponse}
          onChange={(event) => setSettings((current) => ({ ...current, wakeResponse: event.target.value }))}
          maxLength={100}
          className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
        />

        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recognition & voice language</span>
          <select
            value={settings.language}
            onChange={(event) => setSettings((current) => ({
              ...current,
              language: event.target.value as AssistantSettings["language"],
            }))}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
          >
            {languages.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Speech speed</span>
            <span className="text-sm font-semibold">{settings.speechRate.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.25"
            step="0.05"
            value={settings.speechRate}
            onChange={(event) => setSettings((current) => ({
              ...current,
              speechRate: Number(event.target.value),
            }))}
            className="mt-3 w-full"
          />
        </label>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-sm font-semibold">Voice behaviour</p>

        <label className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Speak Assistant replies</p>
            <p className="text-sm text-slate-500">Read answers aloud while Voice Mode is active.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.spokenReplies}
            onChange={(event) => setSettings((current) => ({
              ...current,
              spokenReplies: event.target.checked,
            }))}
            className="mt-1 h-5 w-5"
          />
        </label>

        <label className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Keep listening</p>
            <p className="text-sm text-slate-500">
              After answering, return to wake-word listening instead of ending Voice Mode.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.keepListening}
            onChange={(event) => setSettings((current) => ({
              ...current,
              keepListening: event.target.checked,
            }))}
            className="mt-1 h-5 w-5"
          />
        </label>
      </section>


      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-sm font-semibold">Startup intelligence</p>
        <p className="mt-1 text-sm text-slate-500">Control what Zoro does when the app becomes active.</p>

        <label className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Speak when the app opens</p>
            <p className="text-sm text-slate-500">Zoro attempts a short spoken greeting when a new app session starts.</p>
          </div>
          <input type="checkbox" checked={settings.autoGreeting}
            onChange={(event) => setSettings((current) => ({ ...current, autoGreeting: event.target.checked }))}
            className="mt-1 h-5 w-5" />
        </label>

        <label className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Include useful context</p>
            <p className="text-sm text-slate-500">Add the current top priority or overdue count to the startup greeting when available.</p>
          </div>
          <input type="checkbox" checked={settings.proactiveGreeting}
            onChange={(event) => setSettings((current) => ({ ...current, proactiveGreeting: event.target.checked }))}
            className="mt-1 h-5 w-5" />
        </label>

        <label className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Hands-free wake word</p>
            <p className="text-sm text-slate-500">While the app is active, listen for “{settings.wakeWord}” from other screens and open Zoro.</p>
          </div>
          <input type="checkbox" checked={settings.handsFreeWakeWord}
            onChange={(event) => setSettings((current) => ({ ...current, handsFreeWakeWord: event.target.checked }))}
            className="mt-1 h-5 w-5" />
        </label>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Hands-free wake word works only while the web app is active. iPhone can suspend microphone access when the app is backgrounded, the screen is locked, or the app is closed. The browser may also require one tap before voice can start.
      </div>

      {status && <p className="text-sm text-slate-600">{status}</p>}

      <div className="flex gap-3">
        <button
          disabled={saving}
          onClick={() => void reset()}
          className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold disabled:opacity-50"
        >
          Reset defaults
        </button>
        <button
          disabled={saving}
          onClick={() => void save()}
          className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
