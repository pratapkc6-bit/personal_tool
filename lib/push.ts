import type { Prisma } from "@prisma/client";
import webpush from "web-push";
import { db } from "@/lib/db";
import { vapidConfigured } from "@/lib/notification-settings";

export type AlertPriority="NORMAL"|"IMPORTANT"|"CRITICAL";

export type AlertInput={
  userId:string;
  type:string;
  category:string;
  priority:AlertPriority;
  title:string;
  body:string;
  dedupeKey?:string;
  source?:string;
  sourceRef?:string;
  url?:string;
  alarmSeconds?:number;
  metadata?:Prisma.InputJsonValue;
  deliverPush?:boolean;
};

function setupWebPush(){
  if(!vapidConfigured())return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!,process.env.VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!);
  return true;
}

export async function createAndDeliverAlert(input:AlertInput){
  let notification;
  let created=true;
  try{
    notification=await db.notification.create({data:{
      userId:input.userId,type:input.type,category:input.category,priority:input.priority,title:input.title,body:input.body,
      dedupeKey:input.dedupeKey,source:input.source,sourceRef:input.sourceRef,
      metadata:(input.metadata??{url:input.url||"/notifications",alarmSeconds:input.alarmSeconds||0}) as Prisma.InputJsonValue,
    }});
  }catch(error){
    if(error&&typeof error==="object"&&"code" in error&&(error as {code?:string}).code==="P2002"&&input.dedupeKey){
      notification=await db.notification.findFirst({where:{userId:input.userId,dedupeKey:input.dedupeKey}});
      created=false;
    }else throw error;
  }
  if(!notification)return {created:false,pushed:0,notification:null};
  if(!created||input.deliverPush===false||!setupWebPush())return {created,pushed:0,notification};

  const subscriptions=await db.pushSubscription.findMany({where:{userId:input.userId}});
  const payload=JSON.stringify({
    notificationId:notification.id,title:input.title,body:input.body,priority:input.priority,
    category:input.category,url:input.url||"/notifications",alarmSeconds:input.alarmSeconds||0,
  });
  let pushed=0;
  for(const sub of subscriptions){
    try{
      await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:3600});
      pushed++;
    }catch(error){
      const status=(error as {statusCode?:number})?.statusCode;
      if(status===404||status===410)await db.pushSubscription.deleteMany({where:{endpoint:sub.endpoint}});
    }
  }
  if(pushed>0)await db.notification.update({where:{id:notification.id},data:{deliveredAt:new Date()}});
  return {created,pushed,notification};
}
