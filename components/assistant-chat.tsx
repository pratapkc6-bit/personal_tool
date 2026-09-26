"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Mic,
  MicOff,
  Plus,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import type { AssistantSettings } from "@/lib/assistant-settings";
import type { PendingAction } from "@/lib/intelligence/assistant-contract";
import { MissionPanel } from "@/components/mission-panel";
import pkg from "@/package.json";
import { useDeviceModel } from "@/components/use-device-model";
import { DeviceModelPanel } from "@/components/device-model-panel";
import { canUseDeviceAnswer } from "@/lib/intelligence/device-prompt";

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Array<{ id: string; title: string; href: string }>;
  engine?: string;
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
  "Plan my day",
  "Find 45 minutes tomorrow",
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
  const deviceModel = useDeviceModel();
  const wakeWord = settings.wakeWord.trim();
  const wakeWordLower = wakeWord.toLowerCase();
  const welcomeText =
    "Zoro is ready. Start Voice Mode and say “" +
    wakeWord +
    "”. I’ll respond, “" +
    settings.wakeResponse +
    "”, then listen for your request.";

  const freshConversation = (): Message[] => [
    { role: "assistant", text: welcomeText },
  ];

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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesRef = useRef(messages);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceModeRef = useRef(false);
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
      if (!voiceModeRef.current && !busyRef.current) enableVoiceMode();
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
      setVoiceState("thinking");
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, history }),
      });

      const data = await res.json().catch(() => ({}));
      let reply = data.message || data.error || "Something went wrong.";

      if (deviceModel.state === "ready" && canUseDeviceAnswer(data, res.ok)) {
        try {
          reply = await deviceModel.answer(value, history, data.deviceReference || reply);
          data.engine = "device";
          data.notice = "Generated on this device by a small experimental model. Verify important details. No action was taken.";
        } catch {
          data.notice = "The on-device model could not answer. This is the regular secretary response.";
        }
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: reply,
          sources: data.sources,
          engine: data.engine,
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
    voiceState === "starting" ? "Starting microphone…"
    : voiceState === "listening" ? "Listening for “" + wakeWord + "”…"
    : voiceState === "awake" ? "Listening to your request…"
    : voiceState === "thinking" ? "Thinking through your request…"
    : voiceState === "speaking" ? "Speaking…"
    : voiceState === "permission" ? "Microphone permission blocked"
    : voiceState === "unsupported" ? "Voice recognition unavailable"
    : "Voice ready when you are";

  function messageTime(value?: string) {
    if (!value) return "";
    return new Date(value).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="zoro-ai-workspace">
      <section className="zoro-chat-console">
        <header className="zoro-chat-header">
          <div className={"zoro-voice-core state-" + voiceState + (voiceMode ? " is-live" : "")}>
            <span className="zoro-core-ring core-ring-one" />
            <span className="zoro-core-ring core-ring-two" />
            <Sparkles size={20} />
          </div>

          <div className="zoro-chat-identity">
            <div>
              <strong>Zoro</strong>
              <span className="zoro-runtime-badge">v{pkg.version}</span>
            </div>
            <p>{voiceLabel}</p>
          </div>

          <div className="zoro-chat-tools">
            <button onClick={newChat} title="New conversation">
              <Plus size={17} /><span>New chat</span>
            </button>
            <Link href="/settings/assistant" title="Assistant settings">
              <Settings size={17} /><span>Settings</span>
            </Link>
            <button
              onClick={voiceMode ? stopVoiceMode : enableVoiceMode}
              className={voiceMode ? "voice-enabled" : "voice-disabled"}
              title={voiceMode ? "Stop Voice Mode" : "Start Voice Mode"}
            >
              {voiceMode ? <Mic size={17} /> : <MicOff size={17} />}
              <span>{voiceMode ? "Listening" : "Voice"}</span>
            </button>
          </div>
        </header>

        {voiceMode && (
          <div className="zoro-voice-strip">
            <span className="zoro-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            <p>Say <strong>“{wakeWord}”</strong>, then speak naturally.</p>
            {lastHeard && <span className="zoro-last-heard">Last heard: “{lastHeard}”</span>}
          </div>
        )}

        {(voiceState === "permission" || voiceState === "unsupported") && (
          <div className="zoro-voice-warning">
            {voiceState === "permission"
              ? "Allow microphone access for this site, then start Voice Mode again."
              : "This browser does not expose speech recognition. Try current Safari or the Home Screen app on iPhone."}
          </div>
        )}

        <div role="log" aria-live="polite" aria-relevant="additions" className="zoro-message-stream">
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
                  <span>{message.role === "user" ? "YOU" : message.engine === "device" ? "ZORO · DEVICE" : message.engine === "action" ? "ZORO · ACTION" : "ZORO"}</span>
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
            <div className="zoro-thinking">
              <span><i /><i /><i /></span>
              <p>Zoro is reasoning across your secretary data…</p>
            </div>
          )}

          {pendingAction && (
            <section className="zoro-action-card">
              <div className="zoro-action-head">
                <span>CONFIRMATION REQUIRED</span>
                <strong>No write happens until you approve it.</strong>
              </div>

              <div className="zoro-action-preview">
                {pendingAction.type === "CREATE_TASK" ? (
                  <>
                    <strong>New task · {pendingAction.title}</strong>
                    <p>Priority: {pendingAction.priority}</p>
                    {pendingAction.dueAt && <p>Due: {new Date(pendingAction.dueAt).toLocaleString("en-AU")}</p>}
                  </>
                ) : pendingAction.type === "CREATE_CALENDAR_EVENT" ? (
                  <>
                    <strong>New event · {pendingAction.summary}</strong>
                    <p>{new Date(pendingAction.start).toLocaleString("en-AU")} → {new Date(pendingAction.end).toLocaleString("en-AU")}</p>
                  </>
                ) : (
                  <>
                    <strong>MYOB roster reconciliation</strong>
                    <p>Only roster-managed events may be created, updated or removed.</p>
                  </>
                )}
              </div>

              <div className="zoro-action-buttons">
                <button disabled={busy} onClick={() => { setPendingAction(null); setConfirmationToken(null); }}>Cancel</button>
                <button disabled={busy || !confirmationToken} onClick={confirmAction}>Confirm action</button>
              </div>
            </section>
          )}

          <div ref={conversationEnd} />
        </div>

        <footer className="zoro-composer-zone">
          <div className="zoro-prompt-rail">
            {suggestions.map((prompt) => (
              <button key={prompt} disabled={busy} onClick={() => void send(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="zoro-composer">
            <button
              className={"zoro-composer-mic " + (voiceMode ? "is-live" : "")}
              onClick={voiceMode ? stopVoiceMode : enableVoiceMode}
              aria-label={voiceMode ? "Stop Voice Mode" : "Start Voice Mode"}
            >
              {voiceMode ? <Mic size={18} /> : <MicOff size={18} />}
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
              placeholder="Ask Zoro anything about your day, email, calendar or tasks…"
              rows={1}
            />

            <button className="zoro-send-button" onClick={() => void send()} disabled={busy || !input.trim()} aria-label="Send message">
              <Send size={18} />
            </button>
          </div>
          <p className="zoro-composer-note">Enter to send · Shift+Enter for a new line · actions still require confirmation</p>
        </footer>
      </section>

      <aside className="zoro-intelligence-column">
        <MissionPanel refreshKey={refreshKey} onPrompt={(prompt) => void send(prompt)} />
        <DeviceModelPanel model={deviceModel} busy={busy} />
      </aside>
    </div>
  );
}
