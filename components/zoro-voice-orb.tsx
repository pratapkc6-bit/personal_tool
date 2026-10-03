"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Mic, ShieldCheck, Square, X } from "lucide-react";
import {
  DEFAULT_ASSISTANT_SETTINGS,
  type AssistantSettings,
} from "@/lib/assistant-settings";
import type { PendingAction } from "@/lib/intelligence/assistant-contract";

type VoicePhase =
  | "idle"
  | "opening"
  | "listening"
  | "thinking"
  | "speaking"
  | "permission"
  | "unsupported"
  | "error";

type HistoryMessage = {
  role: "user" | "assistant";
  text: string;
};

type AssistantChoice = {
  label: string;
  value: string;
};

type AssistantResponse = {
  message?: string;
  error?: string;
  engine?: string;
  pendingAction?: PendingAction | null;
  confirmationToken?: string | null;
  choices?: AssistantChoice[];
};

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type RecognitionConstructor = new () => RecognitionLike;

const HISTORY_KEY = "zoro:voice:hidden-history:v1";

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function cleanForSpeech(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/[`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function confirmationIntent(text: string) {
  return /^(yes|yes please|confirm|confirmed|approve|approved|do it|go ahead|proceed|okay do it|ok do it)[.!\s]*$/i.test(text.trim());
}

function rejectionIntent(text: string) {
  return /^(no|cancel|cancel it|don't|do not|stop|never mind|nevermind)[.!\s]*$/i.test(text.trim());
}

function stopIntent(text: string) {
  return /^(stop listening|stop voice|close|close zoro|that's all|thats all|done|goodbye|bye)[.!\s]*$/i.test(text.trim());
}

function actionSummary(action: PendingAction) {
  if (action.type === "CREATE_REMINDER") {
    return `${action.mode === "ALARM" ? "Set alarm" : "Create reminder"} ${action.title}${action.recurrence === "DAILY" ? " every day" : ""}.`;
  }
  if (action.type === "UPDATE_REMINDER") {
    return `Update reminder ${action.title}${action.recurrence === "DAILY" ? " every day" : ""}.`;
  }
  if (action.type === "CREATE_CALENDAR_EVENT") {
    return `Create the calendar event ${action.summary}.`;
  }
  if (action.type === "CREATE_TASK") {
    return `Create the task ${action.title}.`;
  }
  if (action.type === "SEND_EMAIL") {
    return `Send the email to ${action.to} with subject ${action.subject}.`;
  }
  if (action.type === "CREATE_EMAIL_DRAFT") {
    return `Create an email draft to ${action.to} with subject ${action.subject}.`;
  }
  return "Sync your MYOB roster with Google Calendar.";
}

function choiceSpeech(choices: AssistantChoice[]) {
  const labels = choices
    .filter((choice) => choice.label.toLowerCase() !== "cancel")
    .slice(0, 4)
    .map((choice) => choice.label);
  if (!labels.length) return "";
  if (labels.length === 1) return ` You can say ${labels[0]}.`;
  return ` You can say ${labels.slice(0, -1).join(", ")}, or ${labels.at(-1)}.`;
}

export function ZoroVoiceOrb() {
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULT_ASSISTANT_SETTINGS);
  const settingsRef = useRef<AssistantSettings>(DEFAULT_ASSISTANT_SETTINGS);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [status, setStatus] = useState("Tap to speak with Zoro");
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const speakingRef = useRef(false);
  const handlingResultRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const historyRef = useRef<HistoryMessage[]>([]);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const confirmationTokenRef = useRef<string | null>(null);

  function persistHistory() {
    try {
      window.sessionStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(historyRef.current.slice(-20)),
      );
    } catch {
      // Hidden conversation history is a convenience, never a dependency.
    }
  }

  function appendHistory(role: HistoryMessage["role"], text: string) {
    if (!text.trim()) return;
    historyRef.current = [...historyRef.current, { role, text: text.trim() }].slice(-20);
    persistHistory();
  }

  function stopRecognition() {
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    try {
      recognitionRef.current?.abort();
    } catch {
      // Browser implementations can throw when recognition is already stopped.
    }
    recognitionRef.current = null;
  }

  function closeSession() {
    activeRef.current = false;
    setActive(false);
    setPhase("idle");
    setStatus("Tap to speak with Zoro");
    speakingRef.current = false;
    handlingResultRef.current = false;
    stopRecognition();
    window.speechSynthesis?.cancel();
    window.dispatchEvent(new Event("zoro:voice-session-close"));
  }

  function speak(text: string, listenAfter = true) {
    const spoken = cleanForSpeech(text);
    if (!spoken) {
      if (listenAfter) startListening();
      return;
    }

    stopRecognition();
    if (!("speechSynthesis" in window)) {
      setStatus(spoken);
      if (listenAfter) startListening();
      return;
    }

    window.speechSynthesis.cancel();
    speakingRef.current = true;
    setPhase("speaking");
    setStatus("Zoro is speaking");

    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = settingsRef.current.language;
    utterance.rate = settingsRef.current.speechRate;
    utterance.pitch = 1;

    const finish = () => {
      speakingRef.current = false;
      if (!activeRef.current) return;
      if (listenAfter) {
        restartTimerRef.current = window.setTimeout(() => startListening(), 220);
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  async function cancelPendingAction() {
    pendingActionRef.current = null;
    confirmationTokenRef.current = null;
    try {
      await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "cancel" }),
      });
    } catch {
      // Local state is still cleared so a stale approval cannot be tapped by voice.
    }
  }

  async function processResponse(data: AssistantResponse) {
    const reply = data.message || data.error || "I couldn't complete that. Please try again.";
    appendHistory("assistant", reply);

    if (data.pendingAction && data.confirmationToken) {
      pendingActionRef.current = data.pendingAction;
      confirmationTokenRef.current = data.confirmationToken;
      setStatus("Waiting for your confirmation");
      speak(
        `${reply} ${actionSummary(data.pendingAction)} Should I do it? Say yes or no.`,
        true,
      );
      return;
    }

    pendingActionRef.current = null;
    confirmationTokenRef.current = null;

    if (Array.isArray(data.choices) && data.choices.length) {
      setStatus("Zoro needs one detail");
      speak(reply + choiceSpeech(data.choices), true);
      return;
    }

    setStatus(data.engine === "action" ? "Action completed" : "Listening for your next request");
    speak(reply, true);
  }

  async function sendCommand(message: string) {
    const priorHistory = historyRef.current.slice(-20);
    appendHistory("user", message);
    setPhase("thinking");
    setStatus("Zoro is working");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: priorHistory,
        }),
      });
      const data = await response.json().catch(() => ({})) as AssistantResponse;
      await processResponse(data);
    } catch {
      speak("The connection was interrupted. Please try that again.", true);
    }
  }

  async function confirmPendingAction() {
    const token = confirmationTokenRef.current;
    if (!token) {
      await sendCommand("yes");
      return;
    }

    appendHistory("user", "Yes. Confirm it.");
    setPhase("thinking");
    setStatus("Executing your action");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken: token }),
      });
      const data = await response.json().catch(() => ({})) as AssistantResponse;
      pendingActionRef.current = null;
      confirmationTokenRef.current = null;
      await processResponse(data);
    } catch {
      speak("I couldn't verify the action. Please try again.", true);
    }
  }

  async function handleFinalTranscript(transcript: string) {
    const text = transcript.trim();
    if (!text || handlingResultRef.current) return;
    handlingResultRef.current = true;
    stopRecognition();

    try {
      if (stopIntent(text)) {
        appendHistory("user", text);
        appendHistory("assistant", "Voice session closed.");
        if ("speechSynthesis" in window) {
          activeRef.current = false;
          setActive(false);
          setPhase("speaking");
          setStatus("Closing voice assistant");
          const utterance = new SpeechSynthesisUtterance("Okay. Voice assistant closed.");
          utterance.lang = settingsRef.current.language;
          utterance.rate = settingsRef.current.speechRate;
          utterance.onend = closeSession;
          utterance.onerror = closeSession;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } else {
          closeSession();
        }
        return;
      }

      if (pendingActionRef.current && confirmationIntent(text)) {
        await confirmPendingAction();
        return;
      }

      if (pendingActionRef.current && rejectionIntent(text)) {
        appendHistory("user", text);
        await cancelPendingAction();
        appendHistory("assistant", "Cancelled. I did not change anything.");
        speak("Cancelled. I did not change anything. What else can I do for you?", true);
        return;
      }

      await sendCommand(text);
    } finally {
      handlingResultRef.current = false;
    }
  }

  function startListening() {
    if (!activeRef.current || speakingRef.current) return;
    const Recognition = recognitionConstructor();

    if (!Recognition) {
      setPhase("unsupported");
      setStatus("Voice recognition is not supported in this browser");
      return;
    }

    stopRecognition();
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = settingsRef.current.language;
    recognitionRef.current = recognition;
    handlingResultRef.current = false;

    recognition.onstart = () => {
      setPhase("listening");
      setStatus(pendingActionRef.current ? "Say yes or no" : "Listening…");
    };

    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (!result?.isFinal) continue;
        const transcript = result[0]?.transcript || "";
        void handleFinalTranscript(transcript);
        return;
      }
    };

    recognition.onerror = (event) => {
      if (!activeRef.current) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPhase("permission");
        setStatus("Microphone permission is blocked");
        return;
      }
      if (event.error === "no-speech") {
        speak("I didn't catch that. Please say it again.", true);
        return;
      }
      setPhase("error");
      setStatus("Voice connection interrupted");
      restartTimerRef.current = window.setTimeout(() => startListening(), 600);
    };

    recognition.onend = () => {
      if (
        activeRef.current &&
        !speakingRef.current &&
        !handlingResultRef.current
      ) {
        restartTimerRef.current = window.setTimeout(() => startListening(), 450);
      }
    };

    try {
      recognition.start();
    } catch {
      setPhase("error");
      setStatus("Tap the weapon again to retry");
    }
  }

  function openSession() {
    if (activeRef.current) {
      if (phase === "speaking") {
        window.speechSynthesis?.cancel();
        speakingRef.current = false;
        startListening();
      }
      return;
    }

    activeRef.current = true;
    setActive(true);
    setPhase("opening");
    setStatus("Zoro is waking up");
    window.dispatchEvent(new Event("zoro:voice-session-open"));

    if (confirmationTokenRef.current && pendingActionRef.current) {
      speak(
        `You still have an action waiting. ${actionSummary(pendingActionRef.current)} Should I do it?`,
        true,
      );
      return;
    }

    speak("I'm listening. What can I do for you?", true);
  }

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as HistoryMessage[];
        if (Array.isArray(parsed)) {
          historyRef.current = parsed
            .filter((item) =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.text === "string"
            )
            .slice(-20);
        }
      }
    } catch {
      historyRef.current = [];
    }

    fetch("/api/assistant/settings", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.settings) setSettings(data.settings as AssistantSettings);
      })
      .catch(() => undefined);

    const activateFromWakeWord = (event: Event) => {
      const command = (event as CustomEvent<{ command?: string }>).detail?.command?.trim() || "";
      if (!activeRef.current) {
        activeRef.current = true;
        setActive(true);
        setPhase("opening");
        setStatus("Zoro is waking up");
        window.dispatchEvent(new Event("zoro:voice-session-open"));
      }

      if (command) {
        window.speechSynthesis?.cancel();
        speakingRef.current = false;
        stopRecognition();
        void sendCommand(command);
      } else {
        speak("I'm listening. What can I do for you?", true);
      }
    };

    window.addEventListener("zoro:voice-orb-activate", activateFromWakeWord);

    return () => {
      window.removeEventListener("zoro:voice-orb-activate", activateFromWakeWord);
      activeRef.current = false;
      stopRecognition();
      window.speechSynthesis?.cancel();
      window.dispatchEvent(new Event("zoro:voice-session-close"));
    };
  // The voice runtime intentionally mounts once and keeps its hidden conversation across navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        type="button"
        className={"zoro-weapon-orb phase-" + phase + (active ? " is-active" : "")}
        onClick={openSession}
        aria-label={active ? "Zoro voice assistant active" : "Activate Zoro voice assistant"}
        title="Zoro Voice"
      >
        <span className="zoro-weapon-ring ring-one" />
        <span className="zoro-weapon-ring ring-two" />
        <span className="zoro-weapon-cross">
          <Crosshair size={28} strokeWidth={1.65} />
        </span>
        <span className="zoro-weapon-mic"><Mic size={12} /></span>
      </button>

      {active && (
        <section className={"zoro-voice-orb-hud phase-" + phase} role="dialog" aria-label="Zoro voice assistant">
          <div className="zoro-voice-orb-core" aria-hidden="true">
            <span />
            <Crosshair size={24} />
          </div>
          <div className="zoro-voice-orb-status">
            <span>ZORO VOICE</span>
            <strong>{status}</strong>
            <small>
              {pendingActionRef.current
                ? "Approval required before Zoro changes anything."
                : "Conversation stays in the background. Speak naturally."}
            </small>
          </div>
          <div className="zoro-voice-orb-actions">
            <span className="zoro-voice-secure"><ShieldCheck size={13} /> Confirmed actions only</span>
            <button type="button" onClick={closeSession} aria-label="Close Zoro voice assistant">
              {phase === "listening" ? <Square size={15} /> : <X size={16} />}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
