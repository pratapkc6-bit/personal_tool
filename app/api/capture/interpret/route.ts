import { getServerSession } from "next-auth";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { interpretCapture } from "@/lib/capture-interpreter";

const schema=z.object({text:z.string().min(2).max(500)});
export async function POST(req:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const input=schema.parse(await req.json());
    return NextResponse.json(interpretCapture(input.text));
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not interpret capture."},{status:400});
  }
}