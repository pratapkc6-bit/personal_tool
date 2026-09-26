"use client";

import { BrainCircuit, ChevronDown, Cpu, HardDriveDownload } from "lucide-react";
import type { useDeviceModel } from "./use-device-model";

export function DeviceModelPanel({ model, busy }: { model: ReturnType<typeof useDeviceModel>; busy: boolean }) {
  const ready = model.state === "ready";

  return (
    <details className="zoro-engine-card" aria-label="On-device model">
      <summary>
        <span className="zoro-engine-icon">{ready ? <Cpu size={17} /> : <BrainCircuit size={17} />}</span>
        <span className="zoro-engine-copy">
          <strong>Local AI engine</strong>
          <small>{ready ? "Qwen is loaded on this device" : "Optional · no paid API required"}</small>
        </span>
        <span className={`zoro-engine-state state-${model.state}`}>{ready ? "READY" : model.state.toUpperCase()}</span>
        <ChevronDown size={16} className="zoro-engine-chevron" />
      </summary>

      <div className="zoro-engine-body">
        <p>
          The optional Qwen 0.5B model handles open-ended writing and conversation on this device.
          Zoro still uses the verified secretary engine for planning, Gmail, Calendar and confirmation-gated actions.
        </p>
        <p className="zoro-engine-note">
          The model download is large and can use roughly 1 GB of working memory. Safari may clear the cache.
        </p>

        <p role="status" className="zoro-engine-detail">{model.detail}</p>
        {model.state === "loading" && <progress aria-label="Model download progress" value={model.progress} max={1} />}

        <div className="zoro-engine-actions">
          {["idle", "unsupported", "error"].includes(model.state) && (
            <button disabled={busy} onClick={() => void model.check()}>
              <Cpu size={14} /> Check device
            </button>
          )}
          {model.state === "compatible" && (
            <button disabled={busy} onClick={() => void model.load()}>
              <HardDriveDownload size={14} /> Download model
            </button>
          )}
          {["loading", "ready"].includes(model.state) && (
            <button onClick={model.stop}>{model.state === "loading" ? "Cancel download" : "Unload model"}</button>
          )}
          {!["loading", "checking"].includes(model.state) && (
            <button disabled={busy} onClick={() => void model.removeDownload()}>Remove cache</button>
          )}
        </div>
      </div>
    </details>
  );
}
