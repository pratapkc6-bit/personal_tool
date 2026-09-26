import { EmailComposer } from "@/components/email-composer";

export default function ComposePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">GMAIL</p>
        <h1 className="text-2xl font-bold tracking-tight">Compose email</h1>
        <p className="mt-1 text-sm text-slate-600">Saving a draft is safe. Sending always requires a separate explicit confirmation.</p>
      </div>
      <EmailComposer />
    </div>
  );
}
