import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, BrainCircuit, Clock3, Inbox, ShieldCheck, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { buildActionInbox, contextGraph, ZORO_TOOLS } from "@/lib/zoro-platform";
import { APP_VERSION } from "@/lib/release";

export const dynamic="force-dynamic";

export default async function TodayPage(){
  const s=await getServerSession(authOptions);
  if(!s?.user?.id) return <div className="professional-page"><div className="professional-page-surface"><h1>Today</h1><p>Connect your account to build your personal command brief.</p><Link href="/connections" className="professional-primary">Connect your world</Link></div></div>;

  const [items,graph]=await Promise.all([buildActionInbox(s.user.id),contextGraph(s.user.id)]);
  const urgent=items.filter(x=>x.priority<=1);

  return <div className="professional-page">
    <header className="professional-page-header">
      <div>
        <p className="professional-kicker">Zoro Today · v{APP_VERSION}</p>
        <h1>What matters now</h1>
        <p>One priority view across approvals, tasks, email, follow-ups and reminders.</p>
      </div>
      <Link href="/assistant" className="professional-primary"><Sparkles size={16}/> Ask Zoro</Link>
    </header>

    <section className="professional-stat-grid">
      <div className="professional-stat-card"><ShieldCheck/><strong>{urgent.length}</strong><span>Needs attention</span></div>
      <div className="professional-stat-card"><BrainCircuit/><strong>{graph.total}</strong><span>Context nodes</span></div>
      <div className="professional-stat-card"><Sparkles/><strong>{ZORO_TOOLS.length}</strong><span>Registered tools</span></div>
    </section>

    <section className="professional-card">
      <div className="professional-section-heading"><div><p className="professional-kicker">ACTION INBOX</p><h2>Prioritized work</h2></div><Inbox size={19}/></div>
      <div className="professional-list">
        {items.slice(0,12).map((x,i)=><Link key={i} href={x.href} className="professional-list-row">
          <span className="professional-chip">{x.kind.replaceAll("_"," ")}</span>
          <div className="professional-list-copy"><strong>{x.title}</strong>{x.when&&<small><Clock3 size={12}/>{new Date(x.when).toLocaleString("en-AU",{timeZone:"Australia/Darwin"})}</small>}</div>
          <ArrowRight size={17}/>
        </Link>)}
        {!items.length&&<p className="professional-empty">Nothing needs attention right now.</p>}
      </div>
    </section>

    <div className="professional-action-row">
      <Link href="/core" className="professional-secondary">Core Control</Link>
      <Link href="/tasks" className="professional-secondary">Missions</Link>
    </div>
  </div>;
}
