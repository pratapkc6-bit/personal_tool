"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Settings } from "lucide-react";
import type { AssistantSettings } from "@/lib/assistant-settings";

type Message = { role: "user" | "assistant"; text: string; sources?: Array<{ id: string; title: string; href: string }>; engine?: string; notice?: string };
import type { PendingAction } from "@/lib/intelligence/assistant-contract";
import { MissionPanel } from "@/components/mission-panel";
import pkg from "@/package.json";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
};

type RecognitionConstructor = new () => SpeechRecognitionLike;

type VoiceState =
  | "off"
  | "starting"
  | "listening"
  | "awake"
  | "thinking"
  | "speaking"
  | "permission"
  | "unsupported";

const QUICK_PROMPTS = [
  "What should I do now?",
  "What's important today?",
  "Plan my day",
  "Find 45 minutes tomorrow",
];

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };

  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function speechText(text: string) {
  return text
    .replace(/\[[A-Z_]+\]/g, "")
    .replace(/[•#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function AssistantChat({ settings }: { settings: AssistantSettings }) {
  const wakeWord = settings.wakeWord.trim();
  const wakeWordLower = wakeWord.toLowerCase();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Zoro is ready. Start Voice Mode and say “${wakeWord}”. I’ll respond, “${settings.wakeResponse}”, then listen for your request.`,
    },
  ]);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState(QUICK_PROMPTS);
  const [refreshKey, setRefreshKey] = useState(0);
  const conversationEnd = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("off");
  const [lastHeard, setLastHeard] = useState("");

  const messagesRef = useRef(messages);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceModeRef = useRef(false);
  const awaitingCommandRef = useRef(false);
  const speakingRef = useRef(false);
  const busyRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    conversationEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    return () => {
      voiceModeRef.current = false;
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function stopVoiceMode() {
    voiceModeRef.current = false;
    awaitingCommandRef.current = false;
    setVoiceMode(false);
    setVoiceState("off");
    setLastHeard("");

    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }

  function restartListening(delay = 400) {
    if (!voiceModeRef.current || speakingRef.current || busyRef.current) return;
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);

    restartTimerRef.current = window.setTimeout(() => {
      if (!voiceModeRef.current || speakingRef.current || busyRef.current) return;
      try {
        recognitionRef.current?.start();
      } catch {
        // Some browsers throw if recognition is already active.
      }
    }, delay);
  }

  function speak(text: string, wakePrompt = false) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (settings.keepListening) restartListening();
      else stopVoiceMode();
      return;
    }

    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    speakingRef.current = true;
    setVoiceState("speaking");

    const utterance = new SpeechSynthesisUtterance(speechText(text));
    utterance.lang = settings.language;
    utterance.rate = settings.speechRate;
    utterance.pitch = 1;

    const finish = () => {
      speakingRef.current = false;

      if (!voiceModeRef.current) {
        setVoiceState("off");
        return;
      }

      if (wakePrompt) {
        setVoiceState("awake");
        restartListening(450);
        return;
      }

      if (!settings.keepListening) {
        stopVoiceMode();
        return;
      }

      setVoiceState("listening");
      restartListening(450);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  async function send(valueOverride?: string, fromVoice = false) {
    const value = (valueOverride ?? input).trim();
    if (!value || busyRef.current) return;

    const history = messagesRef.current.slice(-12).map(({ role, text }) => ({ role, text: text.slice(0, 4000) }));
    setPendingAction(null);
    setConfirmationToken(null);
    setInput("");
    setMessages((current) => [...current, { role: "user", text: value }]);
    setBusy(true);
    busyRef.current = true;

    if (fromVoice) {
      recognitionRef.current?.stop();
      setVoiceState("thinking");
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, history }),
      });

      const data = await res.json().catch(() => ({}));
      const reply = data.message || data.error || "Something went wrong.";

      setMessages((current) => [...current, { role: "assistant", text: reply, sources: data.sources, engine: data.engine, notice: data.notice }]);
      setPendingAction(data.pendingAction || null);
      setConfirmationToken(data.confirmationToken || null);
      if (data.suggestedPrompts?.length) setSuggestions(data.suggestedPrompts);
      if (/scan complete/i.test(reply)) setRefreshKey(key => key + 1);
      setBusy(false);
      busyRef.current = false;

      if ((fromVoice || voiceModeRef.current) && settings.spokenReplies) {
        speak(reply);
      } else if (voiceModeRef.current) {
        if (settings.keepListening) {
          setVoiceState("listening");
          restartListening();
        } else {
          stopVoiceMode();
        }
      }
    } catch {
      const reply = "I couldn't complete that request. Please try again.";
      setMessages((current) => [...current, { role: "assistant", text: reply }]);
      setBusy(false);
      busyRef.current = false;

      if ((fromVoice || voiceModeRef.current) && settings.spokenReplies) {
        speak(reply);
      } else if (voiceModeRef.current) {
        restartListening();
      }
    }
  }

  function handleTranscript(raw: string) {
    const transcript = raw.trim();
    if (!transcript) return;

    setLastHeard(transcript);

    if (awaitingCommandRef.current) {
      awaitingCommandRef.current = false;
      void send(transcript, true);
      return;
    }

    const lower = transcript.toLowerCase();
    const wakeIndex = lower.indexOf(wakeWordLower);
    if (wakeIndex < 0) return;

    const afterWake = transcript
      .slice(wakeIndex + wakeWord.length)
      .replace(/^[\s,.:;!?-]+/, "")
      .trim();

    if (afterWake) {
      awaitingCommandRef.current = false;
      void send(afterWake, true);
      return;
    }

    awaitingCommandRef.current = true;
    recognitionRef.current?.stop();
    setVoiceState("awake");
    speak(settings.wakeResponse, true);
  }

  function createRecognition() {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setVoiceState("unsupported");
      return null;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = settings.language;

    recognition.onstart = () => {
      if (voiceModeRef.current && !speakingRef.current) {
        setVoiceState(awaitingCommandRef.current ? "awake" : "listening");
      }
    };

    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (!result?.isFinal) continue;
        handleTranscript(result[0]?.transcript || "");
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        voiceModeRef.current = false;
        setVoiceMode(false);
        setVoiceState("permission");
        return;
      }

      if (voiceModeRef.current && !speakingRef.current) restartListening(700);
    };

    recognition.onend = () => {
      if (voiceModeRef.current && !speakingRef.current && !busyRef.current) {
        restartListening(450);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }

  function enableVoiceMode() {
    const recognition = recognitionRef.current || createRecognition();
    if (!recognition) return;

    voiceModeRef.current = true;
    awaitingCommandRef.current = false;
    setVoiceMode(true);
    setVoiceState("starting");
    setLastHeard("");

    try {
      recognition.start();
    } catch {
      restartListening(250);
    }
  }

  async function confirmAction() {
    if (!pendingAction || !confirmationToken || busyRef.current) return;
    setBusy(true);
    busyRef.current = true;
    recognitionRef.current?.stop();
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data.message || data.error || "The action could not be verified. Check Tasks or Calendar before trying again.";
      setMessages(current => [...current, { role: "assistant", text: reply, engine: "action" }]);
      setRefreshKey(key => key + 1);
      if (voiceModeRef.current && settings.spokenReplies) speak(reply);
    } catch {
      setMessages(current => [...current, { role: "assistant", text: "The connection was interrupted. Check Tasks or Calendar before preparing the action again." }]);
    } finally {
      setPendingAction(null);
      setConfirmationToken(null);
      setBusy(false);
      busyRef.current = false;
      if (voiceModeRef.current && !speakingRef.current) restartListening();
    }
  }

  const voiceLabel =
    voiceState === "starting" ? "Starting microphone…"
    : voiceState === "listening" ? `Listening for “${wakeWord}”…`
    : voiceState === "awake" ? "Listening to your request…"
    : voiceState === "thinking" ? "Thinking…"
    : voiceState === "speaking" ? "Speaking…"
    : voiceState === "permission" ? "Microphone permission was blocked."
    : voiceState === "unsupported" ? "Voice recognition is not supported in this browser."
    : "Voice Mode is off.";

  return (
    <div className="space-y-4">
    <MissionPanel refreshKey={refreshKey} onPrompt={prompt => void send(prompt)} />
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-700">ZORO · v{pkg.version} · LOCAL INTELLIGENCE</p>
            <p className="mt-1 text-xs text-slate-500">{voiceLabel}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings/assistant"
              aria-label="Assistant settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
            >
              <Settings size={18} />
            </Link>
            <button
              type="button"
              onClick={voiceMode ? stopVoiceMode : enableVoiceMode}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${voiceMode ? "bg-emerald-100 text-emerald-900" : "bg-slate-900 text-white"}`}
            >
              {voiceMode ? <Mic size={18} /> : <MicOff size={18} />}
              {voiceMode ? "Voice Mode On" : "Start Voice Mode"}
            </button>
          </div>
        </div>

        {voiceMode && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            Say <strong>“{wakeWord}”</strong>. When the Assistant replies “{settings.wakeResponse}”, speak your request.
            Keep this page open for wake-word listening.
            {lastHeard && <p className="mt-1 truncate">Last heard: “{lastHeard}”</p>}
          </div>
        )}

        {(voiceState === "permission" || voiceState === "unsupported") && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
            {voiceState === "permission"
              ? "Allow microphone access for this site in your browser settings, then start Voice Mode again."
              : "This browser does not expose speech recognition. On iPhone, try the latest Safari or the Home Screen app."}
          </div>
        )}
      </div>

      <div role="log" aria-live="polite" aria-relevant="additions" className="max-h-[65vh] flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "ml-auto bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}
          >
            {message.engine && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{message.engine === "action" ? "Action result" : "Local intelligence"}</p>}
            {message.text}
            {message.notice && <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-amber-800">{message.notice}</p>}
            {message.sources && message.sources.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{message.sources.map(source => <Link key={source.id} href={source.href} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">{source.title}</Link>)}</div>}
          </div>
        ))}

        {busy && (
          <div className="w-fit rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
            Zoro is thinking through your secretary data…
          </div>
        )}

        {pendingAction && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Confirmation required</p>
            <p className="mt-1 text-sm text-amber-950">This preview expires in 10 minutes. Confirm only the details shown here.</p>
            <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-900">
              {pendingAction.type === "CREATE_TASK" ? <><p className="font-semibold">New task: {pendingAction.title}</p><p>Priority: {pendingAction.priority}</p>{pendingAction.dueAt && <p>Due: {new Date(pendingAction.dueAt).toLocaleString("en-AU")}</p>}</>
                : pendingAction.type === "CREATE_CALENDAR_EVENT" ? <><p className="font-semibold">New event: {pendingAction.summary}</p><p>{new Date(pendingAction.start).toLocaleString("en-AU")} – {new Date(pendingAction.end).toLocaleString("en-AU")}</p><p className="mt-1 text-xs text-slate-500">Times shown in your device timezone. Review for conflicts before confirming.</p></>
                : <p>Reconcile the latest MYOB roster. Only roster-managed events may be created, updated or removed.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy}
                onClick={() => { setPendingAction(null); setConfirmationToken(null); }}
                className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={busy || !confirmationToken}
                onClick={confirmAction}
                className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Confirm action
              </button>
            </div>
          </div>
        )}
      </div>

      <div ref={conversationEnd} />
      <div className="border-t border-slate-200 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              disabled={busy}
              onClick={() => void send(prompt)}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            aria-label="Message Zoro"
            maxLength={4000}
            placeholder="Tell Zoro what you want to achieve…"
            rows={2}
            className="min-h-14 flex-1 resize-none rounded-2xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-900"
          />
          <button
            onClick={() => void send()}
            disabled={busy}
            className="rounded-2xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

