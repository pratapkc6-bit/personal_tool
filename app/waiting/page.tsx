import { getServerSession } from "next-auth";
import { Clock3,Hourglass,Inbox,TimerReset } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { buildWaitingRadar } from "@/lib/waiting-radar";
import { WaitingRadarClient } from "@/components/waiting-radar-client";

export const dynamic="force-dynamic";

export default async function WaitingPage(){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return <div className="professional-page"><div className="professional-card"><h1>Waiting Radar</h1><p className="professional-body-copy">Connect your account to track waiting items.</p></div></div>;
  const radar=await buildWaitingRadar(session.user.id);
  return <div className="professional-page waiting-page">
    <header className="professional-page-header">
      <div>
        <p className="professional-kicker">WAITING RADAR</p>
        <h1>Stop forgetting what you’re waiting for.</h1>
        <p>Follow-ups are separated into overdue, due today, upcoming and unscheduled so waiting work stops disappearing into the void.</p>
      </div>
    </header>

    <section className="briefing-score-grid waiting-score-grid">
      <Metric label="Overdue" value={radar.counts.overdue} Icon={Hourglass}/>
      <Metric label="Due today" value={radar.counts.dueToday} Icon={Clock3}/>
      <Metric label="Upcoming" value={radar.counts.upcoming} Icon={Inbox}/>
      <Metric label="No date" value={radar.counts.unscheduled} Icon={TimerReset}/>
    </section>

    <WaitingRadarClient sections={[
      {title:"Overdue",empty:"Nothing overdue.",items:radar.overdue,tone:"danger"},
      {title:"Due today",empty:"No follow-up due today.",items:radar.dueToday,tone:"today"},
      {title:"Upcoming",empty:"No upcoming follow-up.",items:radar.upcoming,tone:"upcoming"},
      {title:"No follow-up date",empty:"Everything has a date.",items:radar.unscheduled,tone:"quiet"}
    ]}/>

    {radar.longest.length>0&&<section className="professional-card">
      <div className="professional-section-heading"><div><p className="professional-kicker">LONGEST WAITING</p><h2>Items most likely to be forgotten</h2></div></div>
      <div className="waiting-longest">
        {radar.longest.map(item=><div key={item.id}><strong>{item.subject}</strong><span>{item.personCompany||"Unknown"} · {item.waitingDays} days since last update</span></div>)}
      </div>
    </section>}
  </div>;
}
function Metric({label,value,Icon}:{label:string;value:number;Icon:typeof Clock3}){
  return <div className="briefing-metric"><Icon size={17}/><strong>{value}</strong><span>{label}</span></div>;
}