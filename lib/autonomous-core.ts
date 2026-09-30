import { db } from "@/lib/db";
import { audit, activity } from "@/lib/audit";

export const ACTION_TYPES=["CREATE_TASK","CREATE_REMINDER"] as const;
export type ActionType=(typeof ACTION_TYPES)[number];
type ProposalInput={userId:string;eventId?:string;actionType:ActionType;title:string;rationale?:string;payload:Record<string,unknown>;risk?:"LOW"|"MEDIUM"|"HIGH"};

export async function observe(input:{userId:string;type:string;source:string;sourceRef?:string;payload?:Record<string,unknown>;dedupeKey?:string}){
 const event=await db.autonomousEvent.create({data:{...input,payload:input.payload}});
 await activity({userId:input.userId,type:"AUTONOMOUS_EVENT",summary:`Observed: ${input.type}`,details:{eventId:event.id,source:input.source}});
 return event;
}
export async function propose(input:ProposalInput){
 const proposal=await db.actionProposal.create({data:{userId:input.userId,eventId:input.eventId,actionType:input.actionType,title:input.title,rationale:input.rationale,payload:input.payload,risk:input.risk||"LOW",approvalPolicy:"REQUIRE_APPROVAL"}});
 await audit({userId:input.userId,action:"ACTION_PROPOSED",source:"Zoro Core",sourceRef:proposal.id,newState:{actionType:proposal.actionType,status:proposal.status},result:"SUCCESS"});
 return proposal;
}
export async function executeProposal(userId:string,id:string){
 const proposal=await db.actionProposal.findFirst({where:{id,userId}});
 if(!proposal)throw new Error("Proposal not found");
 if(!["PROPOSED","APPROVED"].includes(proposal.status))throw new Error("Proposal is not executable");
 const payload=proposal.payload as Record<string,unknown>; let result:unknown;
 if(proposal.actionType==="CREATE_TASK"){
   const title=String(payload.title||proposal.title).trim();if(!title)throw new Error("Task title is required");
   result=await db.task.create({data:{userId,title,category:String(payload.category||"PERSONAL"),priority:(["URGENT","HIGH","MEDIUM","LOW"].includes(String(payload.priority))?String(payload.priority):"MEDIUM") as any,source:"Zoro Core",nextAction:payload.nextAction?String(payload.nextAction):undefined}});
 } else if(proposal.actionType==="CREATE_REMINDER"){
   const title=String(payload.title||proposal.title).trim(),remindAt=new Date(String(payload.remindAt||""));if(!title||Number.isNaN(remindAt.getTime()))throw new Error("Valid reminder title and time are required");
   result=await db.reminder.create({data:{userId,title,remindAt,status:"OPEN",source:"Zoro Core",ringSeconds:3,timezone:String(payload.timezone||"Australia/Darwin")}});
 } else throw new Error("Unsupported action type");
 const done=await db.actionProposal.update({where:{id},data:{status:"EXECUTED",decidedAt:new Date(),executedAt:new Date(),result:result as any}});
 await audit({userId,action:"ACTION_EXECUTED",source:"Zoro Core",sourceRef:id,newState:{actionType:done.actionType,status:done.status},result:"SUCCESS"});
 await activity({userId,type:"AUTONOMOUS_ACTION",summary:`Executed: ${proposal.title}`,details:{proposalId:id,actionType:proposal.actionType}});
 return done;
}
export async function rejectProposal(userId:string,id:string){
 const proposal=await db.actionProposal.findFirst({where:{id,userId}});if(!proposal)throw new Error("Proposal not found");
 const done=await db.actionProposal.update({where:{id},data:{status:"REJECTED",decidedAt:new Date()}});
 await audit({userId,action:"ACTION_REJECTED",source:"Zoro Core",sourceRef:id,newState:{status:"REJECTED"},result:"SUCCESS"});return done;
}
export async function coreSnapshot(userId:string){
 const [events,proposals]=await Promise.all([db.autonomousEvent.findMany({where:{userId},orderBy:{observedAt:"desc"},take:20}),db.actionProposal.findMany({where:{userId},orderBy:{createdAt:"desc"},take:30})]);
 return {generatedAt:new Date().toISOString(),events,proposals,pending:proposals.filter(x=>x.status==="PROPOSED").length};
}
