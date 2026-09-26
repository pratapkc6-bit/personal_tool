"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { AssistantSettings } from "@/lib/assistant-settings";

type Mission = { headline?: string; overdue?: number };
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void; abort: () => void;
  onstart: (() => void) | null; onend: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};
type RecognitionConstructor = new () => RecognitionLike;

const GREETING_COOLDOWN_MS = 20 * 60 * 1000;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function greetingPeriod() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function buildGreeting(settings: AssistantSettings, mission?: Mission) {
  const parts = [greetingPeriod() + ". Zoro is online."];
  if (settings.proactiveGreeting && mission?.headline) {
    parts.push(mission.headline.replace(/^Start with\s+/i, "Your first priority is ") + ".");
  }
  if (settings.proactiveGreeting && mission?.overdue) {
    parts.push("You have " + mission.overdue + " overdue item" + (mission.overdue === 1 ? "" : "s") + ".");
  }
  return parts.join(" ");
}

export function ZoroPresence() {
  const pathname = usePathname();
  const router = useRouter();
  const settingsRef = useRef<AssistantSettings | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const speakingRef = useRef(false);
  const activeRef = useRef(false);
  const ambientWantedRef = useRef(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [status, setStatus] = useState("Voice needs one tap to activate.");

  function stopAmbient(disableRestart = true) {
    if (disableRestart) ambientWantedRef.current = false;
    activeRef.current = false;
    try { recognitionRef.current?.abort(); } catch {}
  }

  function speak(text: string, settings: AssistantSettings, onDone?: () => void) {
    if (!("speechSynthesis" in window)) { onDone?.(); return false; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.language;
    utterance.rate = settings.speechRate;
    utterance.pitch = 1;
    speakingRef.current = true;
    utterance.onstart = () => { setNeedsGesture(false); setStatus("Zoro voice is active."); };
    const finish = () => { speakingRef.current = false; onDone?.(); };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function openAssistant(transcript: string) {
    const settings = settingsRef.current;
    if (!settings) return;
    stopAmbient(true);
    const lower = transcript.toLowerCase();
    const wake = settings.wakeWord.toLowerCase();
    const index = lower.indexOf(wake);
    const after = index >= 0 ? transcript.slice(index + settings.wakeWord.length).replace(/^[\s,.:;!?-]+/, "").trim() : "";
    if (after) window.sessionStorage.setItem("zoro:pending-command", after);
    window.sessionStorage.setItem("zoro:open-voice", "1");

    const navigate = () => router.push("/assistant");
    if (settings.spokenReplies) speak(settings.wakeResponse, settings, navigate);
    else navigate();
  }

  function startAmbient(settings = settingsRef.current) {
    if (!settings?.handsFreeWakeWord || pathname === "/assistant" || document.visibilityState !== "visible") return;
    const Recognition = recognitionConstructor();
    if (!Recognition) { setStatus("Hands-free wake word is unavailable in this browser."); return; }

    stopAmbient(false);
    ambientWantedRef.current = true;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = settings.language;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      activeRef.current = true;
      setNeedsGesture(false);
      setStatus("Listening for “" + settings.wakeWord + "”.");
    };
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (!result?.isFinal) continue;
        const transcript = result[0]?.transcript?.trim() || "";
        if (transcript.toLowerCase().includes(settings.wakeWord.toLowerCase())) {
          openAssistant(transcript);
          return;
        }
      }
    };
    recognition.onerror = (event) => {
      activeRef.current = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        ambientWantedRef.current = false;
        setNeedsGesture(true);
        setStatus("Tap once to allow hands-free Zoro.");
      }
    };
    recognition.onend = () => {
      activeRef.current = false;
      if (!ambientWantedRef.current || speakingRef.current) return;
      window.setTimeout(() => {
        if (ambientWantedRef.current && !activeRef.current && document.visibilityState === "visible") {
          try { recognition.start(); } catch {}
        }
      }, 650);
    };

    try { recognition.start(); }
    catch {
      ambientWantedRef.current = false;
      setNeedsGesture(true);
      setStatus("Tap once to activate hands-free Zoro.");
    }
  }

  async function activateFromGesture() {
    const settings = settingsRef.current;
    if (!settings) return;
    setNeedsGesture(false);
    if (settings.autoGreeting) speak(greetingPeriod() + ". Zoro is ready.", settings, () => startAmbient(settings));
    else startAmbient(settings);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/assistant/settings", { cache: "no-store" }).then(async (res) => res.ok ? res.json() : null),
      fetch("/api/assistant", { cache: "no-store" }).then(async (res) => res.ok ? res.json() : null),
    ]).then(([settingsData, missionData]) => {
      if (cancelled || !settingsData?.settings) return;
      const settings = settingsData.settings as AssistantSettings;
      settingsRef.current = settings;

      const lastGreeting = Number(window.localStorage.getItem("zoro:last-startup-greeting") || 0);
      const shouldGreet = settings.autoGreeting && Date.now() - lastGreeting > GREETING_COOLDOWN_MS;
      const afterGreeting = () => {
        if (settings.handsFreeWakeWord && pathname !== "/assistant") startAmbient(settings);
      };

      if (shouldGreet) {
        window.localStorage.setItem("zoro:last-startup-greeting", String(Date.now()));
        const started = speak(buildGreeting(settings, missionData?.mission), settings, afterGreeting);
        if (started) {
          window.setTimeout(() => {
            if (!speakingRef.current && !activeRef.current && settings.handsFreeWakeWord && pathname !== "/assistant") {
              setNeedsGesture(true);
              setStatus("Tap once if your browser blocked automatic voice.");
            }
          }, 900);
        } else afterGreeting();
      } else if (settings.handsFreeWakeWord && pathname !== "/assistant") {
        startAmbient(settings);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
      stopAmbient(true);
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const settings = settingsRef.current;
    if (!settings) return;

    if (pathname === "/assistant") {
      stopAmbient(true);
      return;
    }

    if (settings.handsFreeWakeWord && !speakingRef.current) {
      const timer = window.setTimeout(() => startAmbient(settings), 500);
      return () => {
        window.clearTimeout(timer);
        stopAmbient(true);
      };
    }

    return () => stopAmbient(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onVisibility = () => {
      const settings = settingsRef.current;
      if (!settings) return;
      if (document.visibilityState === "hidden") stopAmbient(true);
      else if (settings.handsFreeWakeWord && pathname !== "/assistant") startAmbient(settings);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!needsGesture) return null;
  return (
    <div className="zoro-presence-toast" role="status">
      <span className="zoro-presence-orb"><Sparkles size={17} /></span>
      <span className="zoro-presence-copy"><strong>Zoro voice</strong><span>{status}</span></span>
      <button onClick={() => void activateFromGesture()}>Enable</button>
    </div>
  );
}
