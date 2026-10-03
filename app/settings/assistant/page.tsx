import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  DEFAULT_ASSISTANT_SETTINGS,
  loadAssistantSettings,
} from "@/lib/assistant-settings";
import { AssistantSettingsForm } from "@/components/assistant-settings-form";
import { BrainCircuit, Cloud, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AssistantSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <h1 className="text-2xl font-bold">Assistant settings</h1>
        <p className="mt-2 text-slate-600">Connect Google first so your Assistant settings can be saved.</p>
        <Link href="/connections" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white">
          Open Connections
        </Link>
      </div>
    );
  }

  const settings = await loadAssistantSettings(session.user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">ZORO</p>
          <h1 className="text-2xl font-bold tracking-tight">Assistant settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Personalise the wake phrase and voice behaviour.
          </p>
        </div>
        <Link href="/assistant" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">
          Back to Assistant
        </Link>
      </div>

      <section className="professional-card assistant-provider-card">
        <div className="professional-section-heading">
          <div><p className="professional-kicker">AI BRAIN</p><h2>Cloud reasoning</h2></div>
          <BrainCircuit size={19}/>
        </div>
        <div className="assistant-provider-status">
          <span className={process.env.OPENAI_API_KEY?"is-ready":"is-attention"}><Cloud size={16}/>{process.env.OPENAI_API_KEY?"OpenAI connected":"OpenAI not configured"}</span>
          <strong>{process.env.OPENAI_MODEL||"gpt-6-luna"}</strong>
        </div>
        <p className="professional-body-copy">Zoro uses OpenAI only for reasoning and conversation. Calendar, task and other write actions stay inside Zoro's confirmation-controlled action layer.</p>
        <div className="assistant-provider-privacy"><ShieldCheck size={15}/><span>API secrets stay server-side. Zoro sends compact derived context rather than raw Gmail message bodies.</span></div>
      </section>

      <AssistantSettingsForm
        initialSettings={settings}
        defaults={DEFAULT_ASSISTANT_SETTINGS}
      />
    </div>
  );
}
