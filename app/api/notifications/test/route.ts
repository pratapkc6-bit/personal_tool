import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createAndDeliverAlert } from "@/lib/push";
import { loadNotificationSettings, quietHoursActive, vapidConfigured } from "@/lib/notification-settings";

export async function POST(){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const settings=await loadNotificationSettings(session.user.id);
  const result=await createAndDeliverAlert({
    userId:session.user.id,type:"TEST_ALERT",category:"personalReminders",priority:"CRITICAL",
    title:"⏰ Zoro test alarm",body:"Notifications are working. This is a three-second alarm test.",
    dedupeKey:`test:${Date.now()}`,source:"Zoro",url:"/notifications",
    alarmSeconds:settings.alarmEnabled?settings.alarmSeconds:0,
    deliverPush:settings.pushEnabled&&(!quietHoursActive(settings)||settings.quietHours.allowUrgent)
  });
  return NextResponse.json({ok:true,pushed:result.pushed,pushConfigured:vapidConfigured(),notification:result.notification});
}
