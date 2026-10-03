import { getServerSession } from "next-auth";
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
    <div className="zoro-command-page">
      <AssistantChat settings={settings} />
    </div>
  );
}
