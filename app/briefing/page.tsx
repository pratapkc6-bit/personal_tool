import Link from "next/link";
import { getServerSession } from "next-auth";
import { AlarmClock,CalendarClock,CheckCircle2,Clock3,Inbox,RefreshCw,ShieldCheck,TriangleAlert } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { buildBriefing } from "@/lib/briefing-engine";

export const dynamic="force-dynamic";

const clock=(iso?:string|null)=>iso?new Intl.DateTimeFormat("en-AU",{timeZone:"Australia/Darwin",hour:"numeric",minute:"2-digit"}).format(new Date(iso)):"—";
const dateTime=(iso?:string|null)=>iso?new Intl.DateTimeFormat("en-AU",{timeZone:"Australia/Darwin",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}).format(new Date(iso)):"—";

export default async function BriefingPage(){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return <div className="professional-page"><div className="professional-card"><h1>Daily Briefing</h1><p className="professional-body-copy">Connect your account to build a live briefing.</p><Link href="/connections" className="professional-primary">Connections</Link></div></div>;
  const b=await buildBriefing(session.user.id);

  return <div className="professional-page briefing-page">
    <header className="professional-page-header">
      <div>
        <p className="professional-kicker">DAILY BRIEFING 2.0</p>
        <h1>Your day, distilled.</h1>
        <p>One decision-ready view across tasks, email, follow-ups, reminders, approvals and calendar pressure.</p>
      </div>
      <Link href="/briefing" className="professional-secondary"><RefreshCw size={15}/> Refresh</Link>
    </header>

    <section className="briefing-next professional-card">
      <div>
        <p className="professional-kicker">NEXT BEST ACTION</p>
        <h2>{b.nextAction.title}</h2>
        <p>{b.nextAction.detail}</p>
      </div>
      <Link href={b.nextAction.href} className="professional-primary">Open</Link>
    </section>

    <section className="briefing-score-grid">
      <Metric label="Overdue" value={b.counts.overdueTasks} Icon={TriangleAlert}/>
      <Metric label="Due today" value={b.counts.dueToday} Icon={Clock3}/>
      <Metric label="Waiting" value={b.counts.dueFollowups} Icon={Inbox}/>
      <Metric label="Reminders 24h" value={b.counts.reminders24h} Icon={AlarmClock}/>
      <Metric label="Approvals" value={b.counts.pendingApprovals} Icon={ShieldCheck}/>
      <Metric label="Conflicts" value={b.counts.calendarConflicts} Icon={CalendarClock}/>
    </section>

    <section className="professional-card">
      <div className="professional-section-heading">
        <div><p className="professional-kicker">CALENDAR INTELLIGENCE</p><h2>{b.calendar.loadScore}% scheduled load</h2></div>
        <CalendarClock size={19}/>
      </div>
      <div className="briefing-calendar-grid">
        <div>
          <span>Happening now</span>
          <strong>{b.calendar.activeEvent?.title||"Nothing"}</strong>
          <small>{b.calendar.activeEvent?("Until "+clock(b.calendar.activeEvent.end)):"No active event"}</small>
        </div>
        <div>
          <span>Next event</span>
          <strong>{b.calendar.nextEvent?.title||"Clear"}</strong>
          <small>{b.calendar.nextEvent?clock(b.calendar.nextEvent.start):"No upcoming event"}</small>
        </div>
        <div>
          <span>Best free block</span>
          <strong>{b.calendar.freeBlocks[0]?(b.calendar.freeBlocks[0].minutes+" min"):"None"}</strong>
          <small>{b.calendar.freeBlocks[0]?(clock(b.calendar.freeBlocks[0].start)+"–"+clock(b.calendar.freeBlocks[0].end)):"No verified block"}</small>
        </div>
      </div>
      {b.calendar.conflicts.length>0&&<div className="briefing-alert"><TriangleAlert size={16}/><span>{b.calendar.conflicts.length} schedule conflict{b.calendar.conflicts.length===1?"":"s"} detected.</span><Link href="/calendar">Review</Link></div>}
    </section>

    <section className="briefing-two-column">
      <ListCard title="Overdue tasks" href="/tasks" empty="No overdue tasks." rows={b.overdueTasks.map(x=>({id:x.id,title:x.title,sub:x.dueAt?("Due "+dateTime(x.dueAt)):x.priority}))}/>
      <ListCard title="Waiting for follow-up" href="/waiting" empty="No follow-up is due." rows={b.dueFollowups.map(x=>({id:x.id,title:x.subject,sub:x.personCompany||dateTime(x.nextFollowupAt)}))}/>
      <ListCard title="Urgent email" href="/inbox?view=urgent" empty="No urgent email loaded." rows={b.urgentEmail.map(x=>({id:x.id,title:x.subject||"(no subject)",sub:x.recommendedAction||x.sender||x.importance}))}/>
      <ListCard title="Upcoming reminders" href="/reminders" empty="No reminder in the next 24 hours." rows={b.reminders24h.map(x=>({id:x.id,title:x.title,sub:dateTime(x.remindAt)}))}/>
    </section>

    <section className="briefing-freshness">
      <CheckCircle2 size={16}/>
      <span>{b.freshness.gmailFresh?("Gmail intelligence refreshed "+b.freshness.gmailScanAgeHours+"h ago."):"Gmail intelligence may be stale."}</span>
      {!b.freshness.gmailFresh&&<Link href="/inbox?scan=1">Refresh Intel</Link>}
    </section>
  </div>;
}

function Metric({label,value,Icon}:{label:string;value:number;Icon:typeof Clock3}){
  return <div className="briefing-metric"><Icon size={17}/><strong>{value}</strong><span>{label}</span></div>;
}
function ListCard({title,href,rows,empty}:{title:string;href:string;rows:Array<{id:string;title:string;sub:string}>;empty:string}){
  return <section className="professional-card briefing-list-card">
    <div className="professional-section-heading"><h2>{title}</h2><Link href={href}>Open</Link></div>
    {rows.length?rows.slice(0,6).map(row=><Link href={href} key={row.id} className="briefing-row"><strong>{row.title}</strong><span>{row.sub}</span></Link>):<p className="professional-empty">{empty}</p>}
  </section>;
}