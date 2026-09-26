"use client";

import type { useDeviceModel } from "./use-device-model";

export function DeviceModelPanel({ model, busy }: { model: ReturnType<typeof useDeviceModel>; busy: boolean }) {
  return <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4" aria-label="On-device model">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-slate-900">On-device AI · Experimental</h2><span className="text-xs font-semibold text-cyan-800">{model.state === "ready" ? "MODEL READY" : "NO PAID API"}</span></div>
    <p className="mt-2 text-sm text-slate-700">Download Qwen 0.5B to this browser. It helps with open-ended conversation and writing; your verified planning and action previews still use the secretary engine.</p>
    <p className="mt-2 text-xs text-slate-600">Large model download from Hugging Face and MLC/GitHub; use Wi-Fi and allow roughly 1 GB of working memory. Model replies are generated on your device. Messages still pass through the app server for secretary routing, but are not sent to a model provider. This is a small model, so check its answers. Keep this page open. Gmail and Calendar still need internet.</p>
    <p role="status" className="mt-3 break-words text-xs text-slate-700">{model.detail}</p>
    {model.state === "loading" && <progress aria-label="Model download progress" value={model.progress} max={1} className="mt-2 w-full" />}
    <div className="mt-3 flex flex-wrap gap-2">
      {["idle", "unsupported", "error"].includes(model.state) && <button disabled={busy} onClick={() => void model.check()} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Check compatibility</button>}
      {model.state === "compatible" && <button disabled={busy} onClick={() => void model.load()} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Download & test model</button>}
      {["loading", "ready"].includes(model.state) && <button onClick={model.stop} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">{model.state === "loading" ? "Cancel download" : "Stop / unload model"}</button>}
      {!["loading", "checking"].includes(model.state) && <button disabled={busy} onClick={() => void model.removeDownload()} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50">Remove cached model</button>}
    </div>
    <p className="mt-2 text-xs text-slate-500">No automatic download or activation. Safari may clear cached files; reopening the page requires loading the model again.</p>
  </section>;
}
