import Link from "next/link";
import { CloudSun, DatabaseZap, Landmark, MapPin, RefreshCw, ServerCog } from "lucide-react";
import { getDataHub } from "@/lib/data-hub";

export const dynamic="force-dynamic";
function rateRows(data:unknown){return Array.isArray(data)?data as Array<{quote?:string;rate?:number;date?:string}>:[]}

export default async function DataHubPage(){
  const hub=await getDataHub();
  const w=hub.sources.weather.data as any;
  const rates=rateRows(hub.sources.exchange.data);

  return <div className="professional-page">
    <header className="professional-page-header">
      <div>
        <p className="professional-kicker">ZORO INTELLIGENCE</p>
        <h1>Data Hub</h1>
        <p>External signals normalized into a clear operational view with source and health information.</p>
      </div>
      <Link href="/intelligence" className="professional-secondary"><RefreshCw size={15}/> Refresh</Link>
    </header>

    <section className="professional-stat-grid professional-data-grid">
      <article className="professional-stat-card">
        <CloudSun/>
        <span>Darwin weather</span>
        <strong>{w?.current?.temperature_2m??"—"}°C</strong>
        <small>Feels {w?.current?.apparent_temperature??"—"}° · Wind {w?.current?.wind_speed_10m??"—"} km/h</small>
        <em>{hub.sources.weather.source} · {hub.sources.weather.status}</em>
      </article>

      <article className="professional-card">
        <div className="professional-section-heading"><div><p className="professional-kicker">AUD REFERENCE RATES</p><h2>Exchange rates</h2></div><Landmark size={19}/></div>
        <div className="professional-rate-grid">
          {rates.slice(0,6).map(x=><div key={x.quote}><span>{x.quote}</span><strong>{x.rate??"—"}</strong></div>)}
        </div>
        <small className="professional-source">{hub.sources.exchange.source} · daily reference data</small>
      </article>

      <article className="professional-card">
        <div className="professional-section-heading"><div><p className="professional-kicker">LOCAL CONTEXT</p><h2>Darwin / NT</h2></div><MapPin size={19}/></div>
        <p className="professional-body-copy">Holiday context and local signals are available to Zoro reminders, briefings and alerts.</p>
        <small className="professional-source">{hub.sources.holidays.source}</small>
      </article>
    </section>

    <section className="professional-card professional-policy-card">
      <ServerCog size={20}/>
      <div>
        <p className="professional-kicker">SOURCE POLICY</p>
        <h2>Transparent data sources</h2>
        <p className="professional-body-copy">Zoro keeps source identity and health visible. Weather data supports planning while official BOM warnings remain authoritative. Currency values are reference rates, not live trading quotes.</p>
      </div>
    </section>

    <div className="professional-action-row">
      <Link href="/inbox" className="professional-primary">Open Intel Inbox</Link>
      <Link href="/core" className="professional-secondary">Core Actions</Link>
      <Link href="/settings/system" className="professional-secondary"><DatabaseZap size={15}/> System Health</Link>
    </div>
  </div>;
}
