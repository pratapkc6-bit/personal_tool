import Link from "next/link";
import { getServerSession } from "next-auth";
import { Activity, CheckCircle2, CircleAlert, CircleX, RefreshCw } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getSystemHealth } from "@/lib/system-health";

export const dynamic="force-dynamic";

const icon={healthy:CheckCircle2,attention:CircleAlert,unavailable:CircleX};

export default async function SystemHealthPage(){
  const session=await getServerSession(authOptions);
  const health=await getSystemHealth(session?.user?.id);
  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">Zoro Core</p>
      <div className="mt-1 flex items-center gap-3"><Activity/><h1 className="text-3xl font-black tracking-tight">System Health</h1></div>
      <p className="mt-2 text-sm text-slate-600">A live, read-only view of the services Zoro depends on. No secrets are displayed here.</p>
    </header>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Core status</p><h2 className="mt-1 text-2xl font-black">{health.healthy}/{health.total} systems healthy</h2></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">Zoro v{health.version}</span>
      </div>
    </section>
    <section className="grid gap-3 sm:grid-cols-2">
      {health.checks.map(check=>{const Icon=icon[check.state];return <article key={check.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-start gap-3"><span className="rounded-2xl bg-slate-100 p-2.5"><Icon size={20}/></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{check.label}</h2><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{check.state}</span></div><p className="mt-1 text-sm leading-5 text-slate-600">{check.detail}</p></div></div>
      </article>})}
    </section>
    <section className="flex flex-wrap gap-3">
      <Link href="/settings" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">← Settings</Link>
      <Link href="/settings/system" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"><RefreshCw className="mr-2 inline" size={15}/>Run checks again</Link>
      <Link href="/connections" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">Connections</Link>
    </section>
    <p className="text-xs text-slate-400">Checked {new Date(health.checkedAt).toLocaleString("en-AU",{timeZone:"Australia/Darwin"})} Darwin time.</p>
  </div>
}
