"use client";

import { useEffect, useRef, useState } from "react";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { DEVICE_MODEL, deviceMessages } from "@/lib/intelligence/device-prompt";

type State = "idle" | "checking" | "compatible" | "loading" | "ready" | "unsupported" | "error";
export function useDeviceModel() {
  const [state, setState] = useState<State>("idle");
  const [detail, setDetail] = useState("Check this browser before downloading a model.");
  const [progress, setProgress] = useState(0);
  const engine = useRef<MLCEngineInterface | null>(null);
  const worker = useRef<Worker | null>(null);
  const revision = useRef(0);
  const rejectPending = useRef<((error: Error) => void) | null>(null);

  function release() {
    revision.current++;
    rejectPending.current?.(new Error("Device model stopped."));
    rejectPending.current = null;
    worker.current?.terminate();
    worker.current = null;
    engine.current = null;
  }
  useEffect(() => () => { release(); }, []);

  async function bounded<T>(operation: Promise<T>, milliseconds: number) {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      rejectPending.current = reject;
      timer = setTimeout(() => reject(new Error("The device took too long. Try again with this page in the foreground.")), milliseconds);
    });
    try { return await Promise.race([operation, timeout]); }
    finally { clearTimeout(timer!); rejectPending.current = null; }
  }

  async function check() {
    setState("checking");
    try {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<{ limits: { maxBufferSize: number } } | null> } }).gpu;
      if (!window.isSecureContext || !gpu || typeof Worker === "undefined") throw new Error("This browser does not expose the required WebGPU support. Try Safari directly, updated to the latest iOS.");
      const adapter = await bounded(gpu.requestAdapter(), 15_000);
      if (!adapter || adapter.limits.maxBufferSize < 256 * 1024 * 1024) throw new Error("This browser cannot provide enough GPU buffer capacity for this model.");
      setState("compatible");
      setDetail("Basic GPU check passed. Download and a real generation test are still required.");
    } catch (error) {
      setState("unsupported");
      setDetail(error instanceof Error ? error.message : "Device compatibility check failed.");
    }
  }

  async function load() {
    release();
    const run = revision.current;
    setState("loading"); setProgress(0); setDetail("Preparing the model download…");
    try {
      const api = await import("@mlc-ai/web-llm");
      if (run !== revision.current) return;
      worker.current = new Worker(new URL("../lib/intelligence/device.worker.ts", import.meta.url), { type: "module" });
      worker.current.onerror = () => rejectPending.current?.(new Error("The model worker failed. This browser may not support it."));
      const loaded = await bounded(api.CreateWebWorkerMLCEngine(worker.current, DEVICE_MODEL, {
        initProgressCallback: report => { if (run === revision.current) { setProgress(Math.min(1, Math.max(0, report.progress))); setDetail(report.text); } },
      }, { context_window_size: 4096 }), 5 * 60_000);
      if (run !== revision.current) return;
      engine.current = loaded;
      setDetail("Running an on-device generation test…");
      const test = await bounded(loaded.chat.completions.create({ messages: [{ role: "user", content: "Say hello." }], max_tokens: 8, temperature: 0 }), 60_000);
      if (!test.choices[0]?.message.content?.trim()) throw new Error("The model loaded but could not generate a response.");
      if (run !== revision.current) return;
      setState("ready"); setDetail("Generation test passed in this browser. Local model ready for this session.");
    } catch (error) {
      if (run !== revision.current) return;
      release(); setState("error");
      setDetail(error instanceof Error ? error.message.slice(0, 300) : "Could not load the model. The regular secretary remains available.");
    }
  }

  async function answer(message: string, history: Array<{ role: "user" | "assistant"; text: string }>, reference: string) {
    if (!engine.current) throw new Error("Device model is not loaded.");
    const active = engine.current;
    try {
      const result = await bounded(active.chat.completions.create({ messages: deviceMessages(message, history, reference), max_tokens: 300, temperature: 0.3 }), 90_000);
      const text = result.choices[0]?.message.content?.trim();
      if (!text) throw new Error("No response generated.");
      return text;
    } catch (error) {
      release(); setState("error"); setDetail("On-device generation stopped or failed. Regular secretary mode is available; you can reload the model.");
      throw error;
    }
  }

  function stop() { release(); setState("idle"); setDetail("Model stopped and unloaded from memory. Cached download is retained by the browser."); }
  async function removeDownload() {
    release(); setState("checking"); setDetail("Removing the cached model…");
    try {
      const api = await import("@mlc-ai/web-llm");
      await api.deleteModelAllInfoInCache(DEVICE_MODEL);
      setState("idle"); setDetail("Cached model removed.");
    } catch { setState("error"); setDetail("Could not remove the model cache. Clear this site's data in Safari Settings to remove it."); }
  }
  return { state, detail, progress, check, load, stop, removeDownload, answer };
}
