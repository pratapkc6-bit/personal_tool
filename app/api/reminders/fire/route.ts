import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAndDeliverAlert } from "@/lib/push";
import { loadNotificationSettings, quietHoursActive } from "@/lib/notification-settings";

const schema=z.object({id:z.string().min(1)});

export async function POST(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const {id}=schema.parse(await request.json());
    const reminder=await db.reminder.findFirst({where:{id,userId:session.user.id,status:"OPEN"}});
    if(!reminder)return NextResponse.json({error:"Reminder is no longer open."},{status:404});
    const due=reminder.snoozedUntil||reminder.remindAt,now=new Date();
    if(due.getTime()>now.getTime()+10_000)return NextResponse.json({error:"Reminder is not due yet."},{status:409});
    const settings=await loadNotificationSettings(session.user.id),alarmSeconds=settings.alarmEnabled?Math.min(reminder.ringSeconds||settings.alarmSeconds,10):0;
    const result=await createAndDeliverAlert({
      userId:session.user.id,type:"REMINDER_DUE",category:"personalReminders",priority:"CRITICAL",
      title:"⏰ "+reminder.title,body:"Your reminder is due now.",
      dedupeKey:`reminder:${reminder.id}:${due.toISOString()}`,source:"Reminder",sourceRef:reminder.id,
      url:"/notifications",alarmSeconds,
      deliverPush:settings.pushEnabled&&(!quietHoursActive(settings)||settings.quietHours.allowUrgent)
    });
    await db.reminder.update({where:{id:reminder.id},data:{status:"FIRED",snoozedUntil:null}});
    return NextResponse.json({ok:true,pushed:result.pushed,alarmSeconds});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not fire reminder."},{status:400});
  }
}
