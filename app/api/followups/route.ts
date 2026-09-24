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
