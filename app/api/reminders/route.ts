import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, activity } from "@/lib/audit";

const createSchema=z.object({
  title:z.string().min(1).max(180),
  remindAt:z.string().datetime(),
  ringSeconds:z.number().int().min(0).max(10).default(3)
});
const actionSchema=z.object({
  id:z.string().min(1),
  action:z.enum(["done","snooze","reopen"]),
  minutes:z.number().int().min(1).max(1440).optional()
});

export async function GET(){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const reminders=await db.reminder.findMany({
    where:{userId:session.user.id,status:{in:["OPEN","FIRED"]}},
    orderBy:[{snoozedUntil:"asc"},{remindAt:"asc"}],take:100
  });
  return NextResponse.json({reminders});
}

export async function POST(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const input=createSchema.parse(await request.json()),remindAt=new Date(input.remindAt);
    if(remindAt.getTime()<=Date.now())return NextResponse.json({error:"Choose a future reminder time."},{status:400});
    const reminder=await db.reminder.create({data:{
      userId:session.user.id,title:input.title,remindAt,status:"OPEN",source:"Zoro",ringSeconds:input.ringSeconds
    }});
    await audit({userId:session.user.id,action:"REMINDER_CREATED",source:"Zoro",sourceRef:reminder.id,newState:reminder,result:"SUCCESS"});
    await activity({userId:session.user.id,type:"REMINDER",summary:`Reminder created: ${reminder.title}`,details:{reminderId:reminder.id,remindAt:reminder.remindAt}});
    return NextResponse.json({reminder},{status:201});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not create reminder."},{status:400});
  }
}

export async function PATCH(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const input=actionSchema.parse(await request.json());
    const existing=await db.reminder.findFirst({where:{id:input.id,userId:session.user.id}});
    if(!existing)return NextResponse.json({error:"Reminder not found."},{status:404});
    const data=input.action==="done"
      ? {status:"COMPLETED",completedAt:new Date(),snoozedUntil:null}
      : input.action==="snooze"
        ? {status:"OPEN",completedAt:null,snoozedUntil:new Date(Date.now()+(input.minutes||10)*60_000)}
        : {status:"OPEN",completedAt:null,snoozedUntil:null};
    const reminder=await db.reminder.update({where:{id:existing.id},data});
    await activity({userId:session.user.id,type:"REMINDER",summary:input.action==="done"?`Reminder completed: ${reminder.title}`:`Reminder ${input.action}: ${reminder.title}`,details:{reminderId:reminder.id}});
    return NextResponse.json({ok:true,reminder});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not update reminder."},{status:400});
  }
}


export async function DELETE(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const {id}=z.object({id:z.string().min(1)}).parse(await request.json());
    const existing=await db.reminder.findFirst({where:{id,userId:session.user.id}});
    if(!existing)return NextResponse.json({error:"Reminder not found."},{status:404});
    await db.reminder.delete({where:{id:existing.id}});
    await audit({userId:session.user.id,action:"REMINDER_DELETED",source:"Zoro",sourceRef:existing.id,previousState:existing,result:"SUCCESS"});
    await activity({userId:session.user.id,type:"REMINDER",summary:`Reminder deleted: ${existing.title}`,details:{reminderId:existing.id}});
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not delete reminder."},{status:400});
  }
}
