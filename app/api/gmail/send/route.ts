import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGoogleServices } from "@/lib/google";
import { db } from "@/lib/db";
import { audit, activity } from "@/lib/audit";

const schema = z.object({
  draftId: z.string().min(1),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const { gmail } = await getGoogleServices(session.user.id);
    const sent = await gmail.users.drafts.send({ userId: "me", requestBody: { id: input.draftId } });
    await db.emailAction.create({
      data: { userId: session.user.id, actionType: "EMAIL_SENT", status: "SENT", draftId: input.draftId, payload: { messageId: sent.data.id } },
    });
    await audit({ userId: session.user.id, action: "EMAIL_SENT", source: "UserConfirmed", sourceRef: sent.data.id, newState: { draftId: input.draftId }, result: "SUCCESS" });
    await activity({ userId: session.user.id, type: "EMAIL", summary: "Confirmed email sent", details: { draftId: input.draftId, messageId: sent.data.id } });
    return NextResponse.json({ messageId: sent.data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send email" }, { status: 400 });
  }
}
