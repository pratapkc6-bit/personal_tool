import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const ZORO_TOOLS=[
 {id:"task.create",risk:"LOW",mode:"execute",description:"Create a personal task"},
 {id:"reminder.create",risk:"LOW",mode:"execute",description:"Create a reminder"},
 {id:"calendar.read",risk:"LOW",mode:"read",description:"Read calendar commitments"},
 {id:"gmail.read",risk:"LOW",mode:"read",description:"Read connected Gmail intelligence"},
 {id:"gmail.draft",risk:"MEDIUM",mode:"approval",description:"Prepare an email draft"},
 {id:"gmail.send",risk:"HIGH",mode:"approval",description:"Send email externally"},
 {id:"calendar.create",risk:"MEDIUM",mode:"approval",description:"Create calendar event"},
 {id:"calendar.update",risk:"MEDIUM",mode:"approval",description:"Change calendar event"},
 {id:"environment.air_quality",risk:"LOW",mode:"read",description:"Read current AQI, particulates, ozone and UV"},
 {id:"location.search",risk:"LOW",mode:"read",description:"Resolve cities and postcodes to coordinates and timezones"},
 {id:"places.search",risk:"LOW",mode:"read",description:"Search real places and businesses when Google Places is configured"},
] as const;

export type AutonomyLevel=0|1|2|3|4;
export const autonomyPolicy=(level:AutonomyLevel,risk:string)=>{
 if(level===0)return "OBSERVE";
 if(level===1)return "RECOMMEND";
 if(level===2)return "REQUIRE_APPROVAL";
 if(level===3&&risk==="LOW")return "AUTO_EXECUTE";
 return "REQUIRE_APPROVAL";
};

export async function upsertContextNode(input:{userId:string;kind:string;key:string;label:string;summary?:string;data?:Record<string,unknown>;source:string;sourceRef?:string;confidence?:number}){
 return db.contextNode.upsert({where:{userId_kind_key:{userId:input.userId,kind:input.kind,key:input.key}},create:{...input,data:input.data as Prisma.InputJsonValue},update:{label:input.label,summary:input.summary,data:input.data as Prisma.InputJsonValue,source:input.source,sourceRef:input.sourceRef,confidence:input.confidence??1,lastSeenAt:new Date()}});
}
export async function contextGraph(userId:string){
 const nodes=await db.contextNode.findMany({where:{userId},orderBy:{lastSeenAt:"desc"},take:100});
 const byKind=nodes.reduce<Record<string,typeof nodes>>((a,n)=>{(a[n.kind]??=[]).push(n);return a},{});
 return {nodes,byKind,total:nodes.length};
}
export async function buildActionInbox(userId:string){
 const now=new Date();
 const [tasks,followups,reminders,emails,proposals]=await Promise.all([
  db.task.findMany({where:{userId,status:{in:["OPEN","WAITING"]}},orderBy:{dueAt:"asc"},take:20}),
  db.followup.findMany({where:{userId,status:"OPEN"},orderBy:{nextFollowupAt:"asc"},take:15}),
  db.reminder.findMany({where:{userId,status:"OPEN"},orderBy:{remindAt:"asc"},take:15}),
  db.emailIntelligence.findMany({where:{userId,requiresAction:true},orderBy:{processedAt:"desc"},take:15}),
  db.actionProposal.findMany({where:{userId,status:"PROPOSED"},orderBy:{createdAt:"desc"},take:15})
 ]);
 const items=[
  ...proposals.map(x=>({kind:"APPROVAL",priority:x.risk==="HIGH"?0:1,title:x.title,when:x.createdAt,href:"/core"})),
  ...tasks.map(x=>({kind:x.dueAt&&x.dueAt<now?"OVERDUE_TASK":"TASK",priority:x.priority==="URGENT"?0:x.priority==="HIGH"?1:2,title:x.title,when:x.dueAt,href:"/tasks"})),
  ...emails.map(x=>({kind:"EMAIL_ACTION",priority:x.importance==="URGENT"?0:x.importance==="HIGH"?1:2,title:x.subject||"Email needs action",when:x.deadlineAt||x.receivedAt,href:"/inbox"})),
  ...followups.map(x=>({kind:"WAITING",priority:2,title:x.subject,when:x.nextFollowupAt,href:"/tasks"})),
  ...reminders.map(x=>({kind:"REMINDER",priority:3,title:x.title,when:x.remindAt,href:"/reminders"}))
 ];
 return items.sort((a,b)=>a.priority-b.priority||new Date(a.when||8640000000000000).getTime()-new Date(b.when||8640000000000000).getTime()).slice(0,30);
}
