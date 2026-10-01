import { getServerSession } from "next-auth";
import { NextRequest,NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { searchPlaces } from "@/lib/intelligence-gateway";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const session=await getServerSession(authOptions);
 if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
 const q=req.nextUrl.searchParams.get("q")||"";
 return NextResponse.json(await searchPlaces(q),{headers:{"Cache-Control":"private, max-age=300"}});
}