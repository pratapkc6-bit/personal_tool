"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string };
type PendingAction = Record<string, unknown> & { type: string };

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
  "What can you do?",
  "Am I free tomorrow?",
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

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Zoro is ready. Start Voice Mode and say “Zoro”. I’ll ask, “How can I help you?”, then listen for your request.",
    },
  ]);
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

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      restartListening();
      return;
    }

    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    speakingRef.current = true;
    setVoiceState("speaking");

    const utterance = new SpeechSynthesisUtterance(speechText(text));
    utterance.lang = "en-AU";
    utterance.rate = 1;
    utterance.pitch = 1;

    const finish = () => {
      speakingRef.current = false;
      if (!voiceModeRef.current) {
        setVoiceState("off");
        return;
      }
      setVoiceState(awaitingCommandRef.current ? "awake" : "listening");
      restartListening(450);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  async function send(valueOverride?: string, fromVoice = false) {
    const value = (valueOverride ?? input).trim();
    if (!value || busyRef.current) return;

    const history = messagesRef.current.slice(-10);
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

      setMessages((current) => [...current, { role: "assistant", text: reply }]);
      setPendingAction(data.pendingAction || null);
      setBusy(false);
      busyRef.current = false;

      if (fromVoice || voiceModeRef.current) speak(reply);
    } catch {
      const reply = "I couldn't complete that request. Please try again.";
      setMessages((current) => [...current, { role: "assistant", text: reply }]);
      setBusy(false);
      busyRef.current = false;
      if (fromVoice || voiceModeRef.current) speak(reply);
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
    const wakeIndex = lower.indexOf("zoro");
    if (wakeIndex < 0) return;

    const afterWake = transcript
      .slice(wakeIndex + 4)
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
    speak("How can I help you?");
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
    recognition.lang = "en-AU";

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

  function disableVoiceMode() {
    voiceModeRef.current = false;
    awaitingCommandRef.current = false;
    setVoiceMode(false);
    setVoiceState("off");
    setLastHeard("");

    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }

  async function confirmAction() {
    if (!pendingAction || busyRef.current) return;

    setBusy(true);
    busyRef.current = true;
    recognitionRef.current?.stop();

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedAction: pendingAction }),
    });

    const data = await res.json().catch(() => ({}));
    const reply = data.message || data.error || "The action failed.";

    setMessages((current) => [...current, { role: "assistant", text: reply }]);
    setPendingAction(null);
    setBusy(false);
    busyRef.current = false;

    if (voiceModeRef.current) speak(reply);
  }

  const voiceLabel =
    voiceState === "starting" ? "Starting microphone…"
    : voiceState === "listening" ? "Listening for “Zoro”…"
    : voiceState === "awake" ? "Zoro is listening to your request…"
    : voiceState === "thinking" ? "Zoro is thinking…"
    : voiceState === "speaking" ? "Zoro is speaking…"
    : voiceState === "permission" ? "Microphone permission was blocked."
    : voiceState === "unsupported" ? "Voice recognition is not supported in this browser."
    : "Voice Mode is off.";

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-700">ZORO · LOCAL INTELLIGENCE</p>
            <p className="mt-1 text-xs text-slate-500">{voiceLabel}</p>
          </div>

          <button
            type="button"
            onClick={voiceMode ? disableVoiceMode : enableVoiceMode}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${voiceMode ? "bg-emerald-100 text-emerald-900" : "bg-slate-900 text-white"}`}
          >
            {voiceMode ? <Mic size={18} /> : <MicOff size={18} />}
            {voiceMode ? "Voice Mode On" : "Start Voice Mode"}
          </button>
        </div>

        {voiceMode && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            Say <strong>“Zoro”</strong>. When Zoro says “How can I help you?”, speak your request.
            Keep the Assistant open for wake-word listening.
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

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "ml-auto bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}
          >
            {message.text}
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
            <p className="mt-1 text-sm text-amber-950">This will change stored data or Google Calendar.</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Confirm action
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((prompt) => (
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
            placeholder="Ask Zoro about priorities, Gmail, deadlines, schedule or follow-ups…"
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
  );
}
