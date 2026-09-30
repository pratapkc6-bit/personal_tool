import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const schema=z.object({
  endpoint:z.string().url(),
  keys:z.object({p256dh:z.string().min(1),auth:z.string().min(1)})
});

export async function POST(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const input=schema.parse(await request.json());
    const subscription=await db.pushSubscription.upsert({
      where:{endpoint:input.endpoint},
      create:{userId:session.user.id,endpoint:input.endpoint,p256dh:input.keys.p256dh,auth:input.keys.auth,userAgent:request.headers.get("user-agent")},
      update:{userId:session.user.id,p256dh:input.keys.p256dh,auth:input.keys.auth,userAgent:request.headers.get("user-agent")}
    });
    return NextResponse.json({ok:true,id:subscription.id});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not save push subscription."},{status:400});
  }
}

export async function DELETE(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const body=await request.json().catch(()=>({})) as {endpoint?:string};
    if(body.endpoint)await db.pushSubscription.deleteMany({where:{userId:session.user.id,endpoint:body.endpoint}});
    else await db.pushSubscription.deleteMany({where:{userId:session.user.id}});
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not remove push subscription."},{status:400});
  }
}
