"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Copy,
  Keyboard,
  Mic,
  MicOff,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import type { AssistantSettings } from "@/lib/assistant-settings";
import type { PendingAction } from "@/lib/intelligence/assistant-contract";
import { MissionPanel } from "@/components/mission-panel";
import pkg from "@/package.json";

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Array<{ id: string; title: string; href: string }>;
  engine?: string;
  model?: string;
  notice?: string;
  createdAt?: string;
};

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
  "What changed since yesterday?",
  "Show what I'm waiting for",
  "Check my next appointment",
  "Summarize my urgent email",
  "Plan my day",
];

const CHAT_STORAGE = "zoro:nexus:conversation:v1";

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
  const freshConversation = (): Message[] => [];

  const [messages, setMessages] = useState<Message[]>(freshConversation);
  const [hydrated, setHydrated] = useState(false);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState(QUICK_PROMPTS);
  const [refreshKey, setRefreshKey] = useState(0);
  const conversationEnd = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("off");
  const [lastHeard, setLastHeard] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedConversation, setCopiedConversation] = useState(false);
  const [showJobs, setShowJobs] = useState(false);

  const messagesRef = useRef(messages);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceModeRef = useRef(false);
  const directVoiceRef = useRef(false);
  const awaitingCommandRef = useRef(false);
  const speakingRef = useRef(false);
  const busyRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CHAT_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (
          Array.isArray(parsed) &&
          parsed.length &&
          parsed.every((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.text === "string")
        ) {
          setMessages(parsed.slice(-40));
        }
      }
    } catch {
      // Local history is convenience only. The assistant still works if storage is unavailable.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    conversationEnd.current?.scrollIntoView({ block: "nearest" });
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CHAT_STORAGE, JSON.stringify(messages.slice(-40)));
    } catch {
      // Ignore storage limits/private mode.
    }
  }, [messages, hydrated]);

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


  useEffect(() => {
    const pending = window.sessionStorage.getItem("zoro:pending-command");
    const openedByWakeWord = window.sessionStorage.getItem("zoro:open-voice") === "1";
    window.sessionStorage.removeItem("zoro:open-voice");

    if (pending) {
      window.sessionStorage.removeItem("zoro:pending-command");
      const timer = window.setTimeout(() => void send(pending, true), 450);
      return () => window.clearTimeout(timer);
    }

    if (!settings.handsFreeWakeWord) return;
    const timer = window.setTimeout(() => {
      if (!voiceModeRef.current && !busyRef.current) enableVoiceMode("wake");
    }, openedByWakeWord ? 450 : (settings.autoGreeting ? 5000 : 900));
    return () => window.clearTimeout(timer);
  // Startup behavior is intentionally evaluated once for this Assistant mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetComposer() {
    setInput("");
    if (composerRef.current) composerRef.current.style.height = "";
  }

  function newChat() {
    stopVoiceMode();
    setMessages(freshConversation());
    setPendingAction(null);
    setConfirmationToken(null);
    setSuggestions(QUICK_PROMPTS);
    resetComposer();
    try {
      window.localStorage.removeItem(CHAT_STORAGE);
    } catch {
      // Ignore storage restrictions.
    }
  }

  async function copyMessage(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex((current) => current === index ? null : current), 1400);
    } catch {
      setCopiedIndex(null);
    }
  }

  async function copyConversation() {
    try {
      const transcript = messagesRef.current
        .map((message) => (message.role === "user" ? "You: " : "Zoro: ") + message.text)
        .join("\n\n");
      await navigator.clipboard.writeText(transcript);
      setCopiedConversation(true);
      window.setTimeout(() => setCopiedConversation(false), 1400);
    } catch {
      setCopiedConversation(false);
    }
  }

  function stopVoiceMode() {
    voiceModeRef.current = false;
    awaitingCommandRef.current = false;
    setVoiceMode(false);
    setVoiceState("off");
    setLastHeard("");
    setLiveTranscript("");
    directVoiceRef.current = false;

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
        awaitingCommandRef.current = true;
        setVoiceState("awake");
        restartListening(350);
        return;
      }

      if (!settings.keepListening) {
        stopVoiceMode();
        return;
      }

      awaitingCommandRef.current = directVoiceRef.current;
      setVoiceState(directVoiceRef.current ? "awake" : "listening");
      restartListening(350);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  async function send(valueOverride?: string, fromVoice = false) {
    const value = (valueOverride ?? input).trim();
    if (!value || busyRef.current) return;

    const history = messagesRef.current.slice(-20).map(({ role, text }) => ({
      role,
      text: text.slice(0, 4000),
    }));

    setPendingAction(null);
    setConfirmationToken(null);
    resetComposer();
    setMessages((current) => [
      ...current,
      { role: "user", text: value, createdAt: new Date().toISOString() },
    ]);
    setBusy(true);
    busyRef.current = true;

    if (fromVoice) {
      recognitionRef.current?.stop();
      setLiveTranscript("");
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

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: reply,
          sources: data.sources,
          engine: data.engine,
          model: data.model,
          notice: data.notice,
          createdAt: new Date().toISOString(),
        },
      ]);
      setPendingAction(data.pendingAction || null);
      setConfirmationToken(data.confirmationToken || null);
      if (data.suggestedPrompts?.length) setSuggestions(data.suggestedPrompts);
      if (/scan complete/i.test(reply)) setRefreshKey((key) => key + 1);
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
      setMessages((current) => [
        ...current,
        { role: "assistant", text: reply, createdAt: new Date().toISOString() },
      ]);
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

    setLiveTranscript("");
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
    recognition.interimResults = true;
    recognition.lang = settings.language;

    recognition.onstart = () => {
      if (voiceModeRef.current && !speakingRef.current) {
        setVoiceState(awaitingCommandRef.current ? "awake" : "listening");
      }
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript || "";
        if (result?.isFinal) {
          setLiveTranscript("");
          handleTranscript(transcript);
        } else {
          interim += transcript + " ";
        }
      }
      if (interim.trim()) setLiveTranscript(interim.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        voiceModeRef.current = false;
        setVoiceMode(false);
        setLiveTranscript("");
        setVoiceState("permission");
        return;
      }

      if (event.error === "no-speech") setLiveTranscript("");
      if (voiceModeRef.current && !speakingRef.current) restartListening(600);
    };

    recognition.onend = () => {
      if (voiceModeRef.current && !speakingRef.current && !busyRef.current) {
        restartListening(450);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }

  function enableVoiceMode(mode: "direct" | "wake" = "direct") {
    const recognition = recognitionRef.current || createRecognition();
    if (!recognition) return;

    const direct = mode === "direct";
    voiceModeRef.current = true;
    directVoiceRef.current = direct;
    awaitingCommandRef.current = direct;
    setVoiceMode(true);
    setVoiceState("starting");
    setLastHeard("");
    setLiveTranscript("");

    try {
      recognition.start();
    } catch {
      restartListening(200);
    }
  }

  function interruptAndListen() {
    if (!voiceModeRef.current) return;
    window.speechSynthesis?.cancel();
    speakingRef.current = false;
    directVoiceRef.current = true;
    awaitingCommandRef.current = true;
    setLiveTranscript("");
    setVoiceState("awake");
    restartListening(120);
  }

  async function confirmAction() {
    if (!pendingAction || !confirmationToken || busyRef.current) return;

    setBusy(true);
    busyRef.current = true;
    recognitionRef.current?.stop();

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        data.message ||
        data.error ||
        "The action could not be verified. Check Tasks or Calendar before trying again.";

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: reply,
          engine: "action",
          createdAt: new Date().toISOString(),
        },
      ]);
      setRefreshKey((key) => key + 1);

      if (voiceModeRef.current && settings.spokenReplies) speak(reply);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "The connection was interrupted. Check Tasks or Calendar before preparing the action again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setPendingAction(null);
      setConfirmationToken(null);
      setBusy(false);
      busyRef.current = false;
      if (voiceModeRef.current && !speakingRef.current) restartListening();
    }
  }

  const voiceLabel =
    voiceState === "starting" ? "Opening the microphone…"
    : voiceState === "listening" ? "Say “" + wakeWord + "” when you need me."
    : voiceState === "awake" ? "Speak naturally. I’m listening."
    : voiceState === "thinking" ? "Working on that now…"
    : voiceState === "speaking" ? "Zoro is replying. You can interrupt anytime."
    : voiceState === "permission" ? "Microphone permission blocked"
    : voiceState === "unsupported" ? "Voice recognition unavailable"
    : "Voice is ready.";

  function messageTime(value?: string) {
    if (!value) return "";
    return new Date(value).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  }

  const commandStatus =
    pendingAction ? "Waiting for approval"
    : busy ? "Working"
    : voiceState === "listening" || voiceState === "awake" ? "Listening"
    : voiceState === "thinking" ? "Thinking"
    : voiceState === "speaking" ? "Speaking"
    : "Ready";

  return (
    <div className={"zoro-command-mode state-" + voiceState + (voiceMode ? " voice-active" : "")}>
      <header className="zoro-command-header">
        <Link href="/" className="zoro-command-home" aria-label="Return home">
          <ArrowLeft size={19} /><span>Home</span>
        </Link>

        <div className="zoro-command-brand">
          <span className={"zoro-command-mini-core " + (busy || voiceMode ? "is-active" : "")}>
            <span />
            <Sparkles size={16} />
          </span>
          <div>
            <strong>Zoro</strong>
            <small>{commandStatus} · v{pkg.version}</small>
          </div>
        </div>

        <div className="zoro-command-tools">
          <button onClick={() => setShowJobs(true)} aria-label="Open Zoro context">
            <BriefcaseBusiness size={18} /><span>Context</span>
          </button>
          <button onClick={newChat} aria-label="Start a new conversation">
            <Plus size={18} /><span>New</span>
          </button>
          <Link href="/settings/assistant" aria-label="Assistant settings">
            <Settings size={18} /><span>Settings</span>
          </Link>
        </div>
      </header>

      <main className="zoro-command-main">
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className={"zoro-command-stream" + (messages.length === 0 ? " is-empty" : "")}
        >
          {messages.length === 0 && (
            <section className="zoro-command-welcome">
              <div className={"zoro-command-orb " + (busy || voiceMode ? "is-active" : "")}>
                <span className="zoro-command-orbit orbit-one" />
                <span className="zoro-command-orbit orbit-two" />
                <span className="zoro-command-orbit orbit-three" />
                <Sparkles size={38} />
              </div>
              <p className="zoro-command-eyebrow">PERSONAL COMMAND MODE</p>
              <h1>What are we getting done?</h1>
              <p className="zoro-command-intro">
                Ask naturally. Zoro can reason across your calendar, tasks, Gmail intelligence and reminders, then prepare actions for your approval.
              </p>
              <div className="zoro-command-capability-row" aria-label="Zoro capabilities">
                <span><Mic size={13} /> Voice</span>
                <span><Sparkles size={13} /> Reason</span>
                <span><ShieldCheck size={13} /> Confirm before acting</span>
              </div>
              <div className="zoro-command-starters">
                {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                  <button key={prompt} disabled={busy} onClick={() => void send(prompt)}>
                    <Sparkles size={15} /><span>{prompt}</span>
                  </button>
                ))}
              </div>
              <button
                className="zoro-command-voice-launch"
                onClick={voiceMode ? stopVoiceMode : () => enableVoiceMode("direct")}
              >
                <Mic size={21} />
                <span>Talk to Zoro</span>
              </button>
            </section>
          )}

          {messages.map((message, index) => (
            <article
              key={index}
              className={"zoro-message " + (message.role === "user" ? "is-user" : "is-zoro")}
            >
              {message.role === "assistant" && (
                <div className="zoro-message-avatar"><Sparkles size={14} /></div>
              )}
              <div className="zoro-message-body">
                <div className="zoro-message-meta">
                  <span>{message.role === "user" ? "YOU" : message.engine === "action" ? "ZORO · ACTION" : message.engine === "openai" ? "ZORO · CLOUD" : "ZORO"}</span>
                  {message.createdAt && <time>{messageTime(message.createdAt)}</time>}
                  {message.role === "assistant" && (
                    <button onClick={() => void copyMessage(message.text, index)} aria-label="Copy response">
                      <Copy size={13} /> {copiedIndex === index ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                <div className="zoro-message-text">{message.text}</div>
                {message.notice && <p className="zoro-message-notice">{message.notice}</p>}
                {message.sources && message.sources.length > 0 && (
                  <div className="zoro-source-row">
                    {message.sources.map((source) => (
                      <Link key={source.id} href={source.href}>{source.title}</Link>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}

          {busy && (
            <section className="zoro-work-card" aria-live="polite">
              <div className="zoro-work-core"><Sparkles size={17} /></div>
              <div>
                <strong>Zoro is working</strong>
                <p>Understanding your request · checking Zoro context · preparing the next useful step</p>
              </div>
              <span className="zoro-work-dots"><i /><i /><i /></span>
            </section>
          )}

          {pendingAction && (
            <section className="zoro-action-card zoro-action-sheet">
              <div className="zoro-action-head">
                <span>READY TO ACT</span>
                <strong>Review this before Zoro changes anything.</strong>
              </div>
              <div className="zoro-action-preview">
                {pendingAction.type === "CREATE_TASK" ? (
                  <>
                    <strong>Create task · {pendingAction.title}</strong>
                    <p>Priority: {pendingAction.priority}</p>
                    {pendingAction.dueAt && <p>Due: {new Date(pendingAction.dueAt).toLocaleString("en-AU")}</p>}
                  </>
                ) : pendingAction.type === "CREATE_CALENDAR_EVENT" ? (
                  <>
                    <strong>Create event · {pendingAction.summary}</strong>
                    <p>{new Date(pendingAction.start).toLocaleString("en-AU")} → {new Date(pendingAction.end).toLocaleString("en-AU")}</p>
                  </>
                ) : (
                  <>
                    <strong>Sync MYOB roster</strong>
                    <p>Reconcile roster-managed events with Google Calendar.</p>
                  </>
                )}
              </div>
              <div className="zoro-action-buttons">
                <button disabled={busy} onClick={() => { setPendingAction(null); setConfirmationToken(null); }}>Cancel</button>
                <button disabled={busy || !confirmationToken} onClick={confirmAction}>Confirm</button>
              </div>
            </section>
          )}

          <div ref={conversationEnd} />
        </div>
      </main>

      <footer className="zoro-command-composer-zone">
        {messages.length > 0 && (
          <div className="zoro-prompt-rail zoro-command-prompt-rail">
            {suggestions.slice(0, 5).map((prompt) => (
              <button key={prompt} disabled={busy} onClick={() => void send(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div className="zoro-command-composer">
          <button
            className={"zoro-command-mic " + (voiceMode ? "is-live" : "")}
            onClick={voiceMode ? stopVoiceMode : () => enableVoiceMode("direct")}
            aria-label={voiceMode ? "Stop Voice Mode" : "Start Voice Mode"}
          >
            {voiceMode ? <Mic size={21} /> : <MicOff size={21} />}
          </button>
          <textarea
            ref={composerRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onInput={(event) => {
              event.currentTarget.style.height = "0px";
              event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 140) + "px";
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            aria-label="Message Zoro"
            maxLength={4000}
            placeholder="Ask Zoro to plan, check, remind, prepare or explain…"
            rows={1}
          />
          <button
            className="zoro-command-send"
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </footer>

      {voiceMode && !["permission", "unsupported"].includes(voiceState) && (
        <div className={"zoro-voice-immersive zoro-voice-v3 state-" + voiceState} role="dialog" aria-modal="true" aria-label="Zoro Voice Mode">
          <header className="zoro-voice-topbar">
            <div className="zoro-voice-session">
              <span className="zoro-voice-session-dot" />
              <div>
                <strong>Zoro Voice</strong>
                <small>Live assistant session</small>
              </div>
            </div>
            <div className="zoro-voice-top-actions">
              <span className="zoro-voice-private"><ShieldCheck size={14} /> Actions require approval</span>
              <button className="zoro-voice-close" onClick={stopVoiceMode} aria-label="Close Voice Mode"><X size={18} /></button>
            </div>
          </header>

          <main className="zoro-voice-stage">
            <button
              className={"zoro-voice-orb-button state-" + voiceState}
              onClick={voiceState === "speaking" ? interruptAndListen : undefined}
              disabled={voiceState !== "speaking"}
              aria-label={voiceState === "speaking" ? "Interrupt Zoro and start listening" : commandStatus}
            >
              <span className="zoro-voice-halo halo-one" />
              <span className="zoro-voice-halo halo-two" />
              <span className="zoro-voice-halo halo-three" />
              <span className="zoro-voice-waveform" aria-hidden="true">
                {Array.from({ length: 11 }).map((_, index) => <i key={index} />)}
              </span>
              <span className="zoro-voice-center">
                {voiceState === "speaking" ? <Volume2 size={31} /> : <Mic size={31} />}
              </span>
            </button>

            <p className="zoro-command-eyebrow">ZORO VOICE MODE</p>
            <h2>{commandStatus}</h2>
            <p className="zoro-voice-state-copy">{voiceLabel}</p>

            <section className={"zoro-voice-transcript " + (liveTranscript ? "is-live" : "")} aria-live="polite">
              <span>{voiceState === "speaking" ? "ZORO" : "YOU"}</span>
              <p>
                {liveTranscript
                  || (voiceState === "speaking"
                    ? (messages.at(-1)?.role === "assistant" ? messages.at(-1)?.text : "Replying…")
                    : lastHeard || "Start speaking. Your words will appear here.")}
              </p>
            </section>

            {busy && (
              <div className="zoro-voice-working">
                <span><i /><i /><i /></span>
                <div>
                  <strong>Zoro is working</strong>
                  <small>Reasoning across your available context</small>
                </div>
              </div>
            )}

            {pendingAction && (
              <section className="zoro-voice-approval">
                <div className="zoro-voice-approval-head">
                  <span>READY TO ACT</span>
                  <strong>Approve before Zoro changes anything.</strong>
                </div>
                <div className="zoro-voice-approval-body">
                  {pendingAction.type === "CREATE_TASK" ? (
                    <>
                      <strong>{pendingAction.title}</strong>
                      <p>Create task · {pendingAction.priority} priority{pendingAction.dueAt ? " · " + new Date(pendingAction.dueAt).toLocaleString("en-AU") : ""}</p>
                    </>
                  ) : pendingAction.type === "CREATE_CALENDAR_EVENT" ? (
                    <>
                      <strong>{pendingAction.summary}</strong>
                      <p>Create calendar event · {new Date(pendingAction.start).toLocaleString("en-AU")}</p>
                    </>
                  ) : (
                    <>
                      <strong>Sync MYOB roster</strong>
                      <p>Reconcile roster-managed events with Google Calendar.</p>
                    </>
                  )}
                </div>
                <div className="zoro-voice-approval-actions">
                  <button onClick={() => { setPendingAction(null); setConfirmationToken(null); awaitingCommandRef.current = true; restartListening(200); }}>Cancel</button>
                  <button disabled={busy || !confirmationToken} onClick={confirmAction}>Confirm action</button>
                </div>
              </section>
            )}

            {!busy && !pendingAction && (voiceState === "awake" || voiceState === "listening") && (
              <div className="zoro-voice-quick-actions" aria-label="Voice quick commands">
                {["Plan my day", "Check important email", "What’s next?"].map((prompt) => (
                  <button key={prompt} onClick={() => void send(prompt, true)}>{prompt}</button>
                ))}
              </div>
            )}
          </main>

          <footer className="zoro-voice-footer">
            <button className="zoro-voice-type-button" onClick={stopVoiceMode}>
              <Keyboard size={17} /><span>Return to typing</span>
            </button>
            {voiceState === "speaking" ? (
              <button className="zoro-voice-primary-control" onClick={interruptAndListen}>
                <Mic size={19} /><span>Interrupt & speak</span>
              </button>
            ) : (
              <button
                className="zoro-voice-primary-control"
                onClick={() => {
                  directVoiceRef.current = true;
                  awaitingCommandRef.current = true;
                  setLiveTranscript("");
                  setVoiceState("awake");
                  restartListening(120);
                }}
                disabled={busy}
              >
                <Mic size={19} /><span>{busy ? "Zoro is working" : "Speak now"}</span>
              </button>
            )}
          </footer>
        </div>
      )}

      {(voiceState === "permission" || voiceState === "unsupported") && (
        <div className="zoro-command-alert">
          {voiceState === "permission"
            ? "Microphone access is blocked. Allow it for this site, then try Voice Mode again."
            : "Voice recognition is unavailable in this browser."}
          <button onClick={() => setVoiceState("off")}>Dismiss</button>
        </div>
      )}

      {showJobs && (
        <div className="zoro-context-drawer-backdrop" onClick={() => setShowJobs(false)}>
          <aside className="zoro-context-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="zoro-context-drawer-head">
              <div>
                <p className="zoro-command-eyebrow">ZORO CONTEXT</p>
                <h2>What Zoro is working with</h2>
              </div>
              <button onClick={() => setShowJobs(false)}>Close</button>
            </div>
            <MissionPanel
              refreshKey={refreshKey}
              onPrompt={(prompt) => { setShowJobs(false); void send(prompt); }}
            />
            {messages.length > 0 && (
              <button className="zoro-copy-conversation" onClick={() => void copyConversation()}>
                <Copy size={15} /> {copiedConversation ? "Copied conversation" : "Copy conversation"}
              </button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
