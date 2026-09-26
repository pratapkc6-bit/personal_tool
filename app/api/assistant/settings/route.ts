import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  DEFAULT_ASSISTANT_SETTINGS,
  loadAssistantSettings,
  saveAssistantSettings,
} from "@/lib/assistant-settings";
import { activity, audit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    settings: await loadAssistantSettings(session.user.id),
    defaults: DEFAULT_ASSISTANT_SETTINGS,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const settings = await saveAssistantSettings(session.user.id, body);

    await activity({
      userId: session.user.id,
      type: "ASSISTANT_SETTINGS",
      summary: "Assistant voice preferences saved.",
      details: {
        wakeWord: settings.wakeWord,
        language: settings.language,
        spokenReplies: settings.spokenReplies,
        keepListening: settings.keepListening,
      },
    });

    await audit({
      userId: session.user.id,
      action: "ASSISTANT_SETTINGS_UPDATED",
      source: "AssistantSettings",
      newState: settings,
      result: "SUCCESS",
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save assistant settings." },
      { status: 400 }
    );
  }
}
