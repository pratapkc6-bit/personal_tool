import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGoogleServices } from "@/lib/google";
import { db } from "@/lib/db";
import { audit, activity } from "@/lib/audit";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(50000),
});

function encodeRawEmail(input: z.infer<typeof schema>) {
  const raw = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.message,
  ].join("\r\n");
  return Buffer.from(raw).toString("base64url");
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const { gmail } = await getGoogleServices(session.user.id);
    const draft = await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw: encodeRawEmail(input) } },
    });
    await db.emailAction.create({
      data: {
        userId: session.user.id,
        actionType: "DRAFT_CREATED",
        status: "SAVED",
        draftId: draft.data.id ?? undefined,
        payload: { to: input.to, subject: input.subject },
      },
    });
    await audit({ userId: session.user.id, action: "EMAIL_DRAFT_CREATED", source: "User", sourceRef: draft.data.id, newState: { to: input.to, subject: input.subject }, result: "SUCCESS" });
    await activity({ userId: session.user.id, type: "EMAIL", summary: `Email draft created: ${input.subject}`, details: { draftId: draft.data.id } });
    return NextResponse.json({ draftId: draft.data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create draft" }, { status: 400 });
  }
}
