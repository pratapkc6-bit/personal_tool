import Link from "next/link";
import { getServerSession } from "next-auth";
import { Settings, Sparkles } from "lucide-react";
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
    <div className="nexus-page">
      <div className="nexus-page-heading">
        <div className="nexus-page-icon"><Sparkles size={22} /></div>
        <div className="nexus-page-title">
          <p className="nexus-kicker">AI COMMAND LAYER</p>
          <h1>Zoro intelligence</h1>
          <p>
            Talk, type, plan and prepare actions. Say “{settings.wakeWord}” while Voice Mode is active.
          </p>
        </div>
        <Link href="/settings/assistant" className="nexus-secondary-action">
          <Settings size={16} /> Preferences
        </Link>
      </div>

      <AssistantChat settings={settings} />
    </div>
  );
}
