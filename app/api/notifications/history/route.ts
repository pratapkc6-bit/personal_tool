import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const url=new URL(request.url),unread=url.searchParams.get("unread")==="1";
  const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||50)));
  const notifications=await db.notification.findMany({
    where:{userId:session.user.id,...(unread?{readAt:null}:{})},
    orderBy:{createdAt:"desc"},take:limit
  });
  return NextResponse.json({notifications});
}

export async function PATCH(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>({})) as {id?:string;action?:string};
  if(body.action==="read-all"){
    await db.notification.updateMany({where:{userId:session.user.id,readAt:null},data:{readAt:new Date()}});
    return NextResponse.json({ok:true});
  }
  if(!body.id)return NextResponse.json({error:"Notification id is required."},{status:400});
  const existing=await db.notification.findFirst({where:{id:body.id,userId:session.user.id}});
  if(!existing)return NextResponse.json({error:"Notification not found."},{status:404});
  const item=await db.notification.update({where:{id:body.id},data:{readAt:new Date()}});
  return NextResponse.json({ok:true,notification:item});
}
