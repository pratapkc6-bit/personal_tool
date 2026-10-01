import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";
import { analyzeCalendar, type CalendarSignalEvent } from "@/lib/calendar-intelligence";

const TZ=process.env.APP_TIMEZONE||"Australia/Darwin";

const dayKey=(date:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
const hours=(ms:number)=>Math.round(ms/36e5);

export async function buildBriefing(userId:string,now=new Date()){
  const day=dayKey(now);
  const [tasks,followups,reminders,emails,approvals,lastScan]=await Promise.all([
    db.task.findMany({where:{userId,status:{in:["OPEN","WAITING"]}},orderBy:{dueAt:"asc"},take:50}),
    db.followup.findMany({where:{userId,status:"OPEN"},orderBy:{nextFollowupAt:"asc"},take:50}),
    db.reminder.findMany({where:{userId,status:{in:["OPEN","FIRED"]}},orderBy:{remindAt:"asc"},take:50}),
    db.emailIntelligence.findMany({where:{userId,requiresAction:true},orderBy:[{deadlineAt:"asc"},{processedAt:"desc"}],take:50}),
    db.actionProposal.findMany({where:{userId,status:"PROPOSED"},orderBy:{createdAt:"desc"},take:30}),
    db.emailIntelligence.findFirst({where:{userId},orderBy:{processedAt:"desc"},select:{processedAt:true}})
  ]);

  let calendarStatus:"available"|"unavailable"="unavailable";
  let events:CalendarSignalEvent[]=[];
  try{
    const {calendar}=await getGoogleServices(userId);
    const start=new Date(now);start.setHours(0,0,0,0);
    const end=new Date(start);end.setDate(end.getDate()+2);
    const result=await calendar.events.list({
      calendarId:"primary",timeMin:start.toISOString(),timeMax:end.toISOString(),
      singleEvents:true,orderBy:"startTime",maxResults:100
    });
    events=(result.data.items??[]).flatMap(event=>{
      const startValue=event.start?.dateTime||event.start?.date;
      const endValue=event.end?.dateTime||event.end?.date;
      if(!event.id||!startValue||!endValue)return [];
      return [{id:event.id,title:event.summary||"Untitled event",start:startValue,end:endValue,allDay:!event.start?.dateTime}];
    });
    calendarStatus="available";
  }catch{}

  const calendar=analyzeCalendar(events,now);
  const overdueTasks=tasks.filter(x=>x.dueAt&&x.dueAt<now);
  const dueToday=tasks.filter(x=>x.dueAt&&x.dueAt>=now&&dayKey(x.dueAt)===day);
  const dueFollowups=followups.filter(x=>x.nextFollowupAt&&x.nextFollowupAt<=now);
  const reminders24h=reminders.filter(x=>{
    const t=(x.snoozedUntil||x.remindAt).getTime();
    return t>=now.getTime()&&t<=now.getTime()+86400000;
  });
  const urgentEmail=emails.filter(x=>x.importance==="URGENT"||x.importance==="HIGH");
  const scanAgeHours=lastScan?.processedAt?hours(now.getTime()-lastScan.processedAt.getTime()):null;

  const nextAction=
    approvals[0]?{title:approvals[0].title,detail:"Approval waiting in Zoro Core",href:"/core",kind:"APPROVAL"}:
    overdueTasks[0]?{title:overdueTasks[0].title,detail:"Overdue task",href:"/tasks",kind:"TASK"}:
    urgentEmail[0]?{title:urgentEmail[0].subject||"Urgent email",detail:urgentEmail[0].recommendedAction||"Email requires action",href:"/inbox",kind:"EMAIL"}:
    dueFollowups[0]?{title:dueFollowups[0].subject,detail:"Follow-up is due",href:"/waiting",kind:"FOLLOWUP"}:
    calendar.activeEvent?{title:calendar.activeEvent.title,detail:"Happening now",href:"/calendar",kind:"CALENDAR"}:
    calendar.nextEvent?{title:calendar.nextEvent.title,detail:"Next calendar event",href:"/calendar",kind:"CALENDAR"}:
    reminders24h[0]?{title:reminders24h[0].title,detail:"Upcoming reminder",href:"/reminders",kind:"REMINDER"}:
    {title:"No urgent action loaded",detail:"Your current loaded data has no immediate blocker.",href:"/today",kind:"CLEAR"};

  return {
    generatedAt:now.toISOString(),timezone:TZ,calendarStatus,nextAction,
    counts:{
      overdueTasks:overdueTasks.length,dueToday:dueToday.length,dueFollowups:dueFollowups.length,
      reminders24h:reminders24h.length,actionableEmail:emails.length,urgentEmail:urgentEmail.length,
      pendingApprovals:approvals.length,calendarConflicts:calendar.conflicts.length
    },
    calendar:{
      nextEvent:calendar.nextEvent,activeEvent:calendar.activeEvent,conflicts:calendar.conflicts.slice(0,5),
      freeBlocks:calendar.freeBlocks.slice(0,4),shortGaps:calendar.shortGaps.slice(0,4),
      loadScore:calendar.loadScore,busyMinutes:calendar.busyMinutes,eventCount:calendar.eventCount
    },
    freshness:{gmailScanAgeHours:scanAgeHours,gmailFresh:scanAgeHours!==null&&scanAgeHours<24},
    overdueTasks:overdueTasks.slice(0,8).map(x=>({id:x.id,title:x.title,dueAt:x.dueAt?.toISOString()||null,priority:x.priority})),
    dueToday:dueToday.slice(0,8).map(x=>({id:x.id,title:x.title,dueAt:x.dueAt?.toISOString()||null,priority:x.priority})),
    dueFollowups:dueFollowups.slice(0,8).map(x=>({id:x.id,subject:x.subject,personCompany:x.personCompany,nextFollowupAt:x.nextFollowupAt?.toISOString()||null})),
    reminders24h:reminders24h.slice(0,8).map(x=>({id:x.id,title:x.title,remindAt:(x.snoozedUntil||x.remindAt).toISOString()})),
    urgentEmail:urgentEmail.slice(0,8).map(x=>({id:x.id,subject:x.subject,sender:x.sender,recommendedAction:x.recommendedAction,deadlineAt:x.deadlineAt?.toISOString()||null,importance:x.importance})),
    approvals:approvals.slice(0,8).map(x=>({id:x.id,title:x.title,risk:x.risk,actionType:x.actionType,createdAt:x.createdAt.toISOString()}))
  };
}