import Link from "next/link";
import { getServerSession } from "next-auth";
import { Settings } from "lucide-react";
import { AssistantChat } from "@/components/assistant-chat";
import { authOptions } from "@/lib/auth";
import {
  DEFAULT_ASSISTANT_SETTINGS,
  loadAssistantSettings,
} from "@/lib/assistant-settings";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const session = await getServerSession(authOptions);
  const settings = session?.user?.id
    ? await loadAssistantSettings(session.user.id)
    : DEFAULT_ASSISTANT_SETTINGS;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">PERSONAL CHIEF OF STAFF</p>
          <h1 className="text-2xl font-bold tracking-tight">Zoro</h1>
          <p className="mt-1 text-sm text-slate-600">
            Type naturally or start Voice Mode. While this screen is open, say “{settings.wakeWord}” to wake the assistant.
            Calendar, task and roster changes still require confirmation.
          </p>
        </div>

        <Link
          href="/settings/assistant"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
        >
          <Settings size={16} />
          Settings
        </Link>
      </div>

      <AssistantChat settings={settings} aiConfigured={Boolean(process.env.OPENAI_API_KEY)} />
    </div>
  );
}
