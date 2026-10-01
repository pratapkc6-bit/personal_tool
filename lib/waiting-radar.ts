import { db } from "@/lib/db";

const TZ=process.env.APP_TIMEZONE||"Australia/Darwin";
const dayKey=(date:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(date);

export async function buildWaitingRadar(userId:string,now=new Date()){
  const items=await db.followup.findMany({
    where:{userId,status:"OPEN"},
    orderBy:[{nextFollowupAt:"asc"},{lastUpdate:"asc"}],
    take:100
  });

  const today=dayKey(now);
  const map=(item:typeof items[number])=>({
    id:item.id,subject:item.subject,personCompany:item.personCompany,expectedResponse:item.expectedResponse,
    nextFollowupAt:item.nextFollowupAt?.toISOString()||null,lastUpdate:item.lastUpdate.toISOString(),
    ageDays:Math.max(0,Math.floor((now.getTime()-item.dateStarted.getTime())/86400000)),
    waitingDays:Math.max(0,Math.floor((now.getTime()-item.lastUpdate.getTime())/86400000)),
    source:item.source
  });

  const overdue=items.filter(x=>x.nextFollowupAt&&x.nextFollowupAt<now).map(map);
  const dueToday=items.filter(x=>x.nextFollowupAt&&x.nextFollowupAt>=now&&dayKey(x.nextFollowupAt)===today).map(map);
  const upcoming=items.filter(x=>x.nextFollowupAt&&dayKey(x.nextFollowupAt)!==today&&x.nextFollowupAt>=now).map(map);
  const unscheduled=items.filter(x=>!x.nextFollowupAt).map(map);
  const longest=[...items].sort((a,b)=>a.lastUpdate.getTime()-b.lastUpdate.getTime()).slice(0,5).map(map);

  return {
    generatedAt:now.toISOString(),timezone:TZ,
    counts:{total:items.length,overdue:overdue.length,dueToday:dueToday.length,upcoming:upcoming.length,unscheduled:unscheduled.length},
    overdue,dueToday,upcoming,unscheduled,longest
  };
}