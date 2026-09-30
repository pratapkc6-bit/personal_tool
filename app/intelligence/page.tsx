import Link from "next/link";
import { CloudSun, DatabaseZap, Landmark, MapPin, RefreshCw } from "lucide-react";
import { getDataHub } from "@/lib/data-hub";
export const dynamic="force-dynamic";
function rateRows(data:unknown){return Array.isArray(data)?data as Array<{quote?:string;rate?:number;date?:string}>:[]}
export default async function DataHubPage(){
 const hub=await getDataHub(); const w=hub.sources.weather.data as any; const rates=rateRows(hub.sources.exchange.data);
 return <div className="mx-auto max-w-5xl space-y-5 pb-10">
  <header><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-700">Zoro Intelligence</p><div className="mt-1 flex items-center gap-3"><DatabaseZap/><h1 className="text-3xl font-black">Data Hub</h1></div><p className="mt-2 text-sm text-slate-600">External intelligence normalized for Zoro, with visible source and health information.</p></header>
  <section className="grid gap-3 md:grid-cols-3">
   <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><CloudSun/><p className="mt-3 text-xs font-bold uppercase text-slate-500">Darwin weather</p><h2 className="mt-1 text-2xl font-black">{w?.current?.temperature_2m??"—"}°C</h2><p className="text-sm text-slate-600">Feels {w?.current?.apparent_temperature??"—"}° · Wind {w?.current?.wind_speed_10m??"—"} km/h</p><p className="mt-3 text-xs text-slate-400">Source: {hub.sources.weather.source} · {hub.sources.weather.status}</p></article>
   <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><Landmark/><p className="mt-3 text-xs font-bold uppercase text-slate-500">AUD reference rates</p><div className="mt-2 grid grid-cols-2 gap-2">{rates.slice(0,6).map(x=><div key={x.quote} className="rounded-xl bg-slate-50 p-2"><b>{x.quote}</b><p className="text-sm">{x.rate??"—"}</p></div>)}</div><p className="mt-3 text-xs text-slate-400">Source: {hub.sources.exchange.source} · daily reference data</p></article>
   <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><MapPin/><p className="mt-3 text-xs font-bold uppercase text-slate-500">NT calendar intelligence</p><h2 className="mt-1 text-xl font-black">Darwin / NT</h2><p className="mt-1 text-sm text-slate-600">Public-holiday context is available to Zoro reminders and alerts.</p><p className="mt-3 text-xs text-slate-400">Source: {hub.sources.holidays.source}</p></article>
  </section>
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><h2 className="font-bold">Source policy</h2><p className="mt-2 text-sm text-slate-600">Zoro records the source and health of external data. Weather forecasts are convenience data and are not a substitute for official BOM warnings. Currency values are reference rates, not live trading prices.</p></section>
  <div className="flex flex-wrap gap-3"><Link href="/intelligence" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"><RefreshCw className="mr-2 inline" size={15}/>Refresh hub</Link><Link href="/settings/system" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">System Health</Link></div>
 </div>
}
