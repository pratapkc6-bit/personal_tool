import Link from "next/link";
import { getServerSession } from "next-auth";
import { Activity,CheckCircle2,CircleAlert,CircleX,RefreshCw,ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getSystemHealth } from "@/lib/system-health";

export const dynamic="force-dynamic";

const icon={healthy:CheckCircle2,attention:CircleAlert,unavailable:CircleX};

export default async function SystemHealthPage(){
  const session=await getServerSession(authOptions);
  const health=await getSystemHealth(session?.user?.id);
  const attention=health.checks.filter(x=>x.state==="attention").length;
  const unavailable=health.checks.filter(x=>x.state==="unavailable").length;

  return <div className="professional-page">
    <header className="professional-page-header">
      <div>
        <p className="professional-kicker">ZORO CORE</p>
        <h1>System Health</h1>
        <p>Live, read-only diagnostics for the services and integrations Zoro depends on. No secrets are exposed.</p>
      </div>
      <Link href="/settings/system" className="professional-secondary"><RefreshCw size={15}/> Run checks</Link>
    </header>

    <section className="system-health-summary professional-card">
      <div className="system-health-score"><ShieldCheck/><strong>{health.healthy}/{health.total}</strong><span>healthy</span></div>
      <div><p className="professional-kicker">RUNTIME STATUS</p><h2>{health.overall==="healthy"?"All monitored systems healthy":"Some systems need attention"}</h2><p className="professional-body-copy">{attention} attention · {unavailable} unavailable · Zoro v{health.version}</p></div>
    </section>

    <section className="system-health-grid">
      {health.checks.map(check=>{const Icon=icon[check.state];return <article key={check.key} className={"system-health-card state-"+check.state}>
        <span className="system-health-icon"><Icon size={19}/></span>
        <div><div className="system-health-title"><strong>{check.label}</strong><span>{check.state}</span></div><p>{check.detail}</p></div>
      </article>})}
    </section>

    <div className="professional-action-row">
      <Link href="/settings" className="professional-secondary">← Settings</Link>
      <Link href="/connections" className="professional-secondary">Connections</Link>
      <Link href="/intelligence" className="professional-secondary">Data Hub</Link>
    </div>
    <p className="professional-source">Checked {new Date(health.checkedAt).toLocaleString("en-AU",{timeZone:"Australia/Darwin"})} Darwin time.</p>
  </div>;
}