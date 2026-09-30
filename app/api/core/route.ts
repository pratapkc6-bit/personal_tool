import { getServerSession } from "next-auth";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { coreSnapshot,executeProposal,observe,propose,rejectProposal } from "@/lib/autonomous-core";
const postSchema=z.discriminatedUnion("operation",[
 z.object({operation:z.literal("observe"),type:z.string().min(1).max(80),source:z.string().min(1).max(80),sourceRef:z.string().max(200).optional(),payload:z.record(z.string(),z.unknown()).optional()}),
 z.object({operation:z.literal("propose"),eventId:z.string().optional(),actionType:z.enum(["CREATE_TASK","CREATE_REMINDER"]),title:z.string().min(1).max(180),rationale:z.string().max(1200).optional(),payload:z.record(z.string(),z.unknown()),risk:z.enum(["LOW","MEDIUM","HIGH"]).optional()}),
 z.object({operation:z.literal("approve"),id:z.string().min(1)}),
 z.object({operation:z.literal("reject"),id:z.string().min(1)})
]);
export async function GET(){const s=await getServerSession(authOptions);if(!s?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json(await coreSnapshot(s.user.id))}
export async function POST(req:NextRequest){const s=await getServerSession(authOptions);if(!s?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});try{const i=postSchema.parse(await req.json());if(i.operation==="observe")return NextResponse.json(await observe({userId:s.user.id,type:i.type,source:i.source,sourceRef:i.sourceRef,payload:i.payload}),{status:201});if(i.operation==="propose")return NextResponse.json(await propose({userId:s.user.id,eventId:i.eventId,actionType:i.actionType,title:i.title,rationale:i.rationale,payload:i.payload,risk:i.risk}),{status:201});if(i.operation==="approve")return NextResponse.json(await executeProposal(s.user.id,i.id));return NextResponse.json(await rejectProposal(s.user.id,i.id))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Core action failed"},{status:400})}}
