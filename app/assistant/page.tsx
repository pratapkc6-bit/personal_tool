import { AssistantChat } from "@/components/assistant-chat";

export default function AssistantPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">PERSONAL CHIEF OF STAFF</p>
        <h1 className="text-2xl font-bold tracking-tight">Zoro</h1>
        <p className="mt-1 text-sm text-slate-600">
          Type naturally or start Voice Mode. While this screen is open, say “Zoro” to wake the assistant.
          Calendar, task and roster changes still require confirmation.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
