import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  subject: z.string().min(1).max(200),
  personCompany: z.string().max(200).optional(),
  expectedResponse: z.string().max(1000).optional(),
  nextFollowupAt: z.string().datetime().nullable().optional(),
  source: z.string().default("User"),
  sourceRef: z.string().optional(),
  notes: z.string().max(5000).optional(),
});
const actionSchema=z.object({
  id:z.string().min(1),
  action:z.enum(["complete","postpone","reopen"]),
  days:z.number().int().min(1).max(60).optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await db.followup.findMany({
    where: { userId: session.user.id, status: "OPEN" },
    orderBy: { nextFollowupAt: "asc" },
  }));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const item = await db.followup.create({
      data: {
        userId: session.user.id,
        subject: input.subject,
        personCompany: input.personCompany,
        expectedResponse: input.expectedResponse,
        nextFollowupAt: input.nextFollowupAt ? new Date(input.nextFollowupAt) : undefined,
        source: input.source,
        sourceRef: input.sourceRef,
        notes: input.notes,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create follow-up" }, { status: 400 });
  }
}


export async function PATCH(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const input=actionSchema.parse(await request.json());
    const existing=await db.followup.findFirst({where:{id:input.id,userId:session.user.id}});
    if(!existing)return NextResponse.json({error:"Follow-up not found."},{status:404});
    const data=input.action==="complete"
      ? {status:"COMPLETED" as const,lastUpdate:new Date()}
      : input.action==="reopen"
        ? {status:"OPEN" as const,lastUpdate:new Date()}
        : {status:"OPEN" as const,lastUpdate:new Date(),nextFollowupAt:new Date(Date.now()+(input.days||3)*86400000)};
    const item=await db.followup.update({where:{id:existing.id},data});
    return NextResponse.json({ok:true,item});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not update follow-up."},{status:400});
  }
}