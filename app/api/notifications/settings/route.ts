import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadNotificationSettings, saveNotificationSettings, vapidConfigured } from "@/lib/notification-settings";

export const dynamic="force-dynamic";

export async function GET(){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const [settings,subscriptions]=await Promise.all([
    loadNotificationSettings(session.user.id),
    db.pushSubscription.count({where:{userId:session.user.id}})
  ]);
  return NextResponse.json({
    settings,
    push:{configured:vapidConfigured(),publicKey:process.env.VAPID_PUBLIC_KEY||"",subscriptions}
  });
}

export async function PUT(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const settings=await saveNotificationSettings(session.user.id,await request.json());
    return NextResponse.json({settings});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not save notification settings."},{status:400});
  }
}
