import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { buildBriefing } from "@/lib/briefing-engine";

export const dynamic="force-dynamic";

export async function GET(){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  return NextResponse.json(await buildBriefing(session.user.id),{headers:{"Cache-Control":"private, no-store"}});
}