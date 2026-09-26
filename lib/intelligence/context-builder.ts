import { buildSecretaryBriefing } from "@/lib/secretary";
import { getGoogleServices } from "@/lib/google";

export type AssistantContext = Awaited<ReturnType<typeof buildAssistantContext>>;

export async function buildAssistantContext(userId: string) {
  const briefing = await buildSecretaryBriefing(userId);
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 86_400_000);
  let calendarStatus: "available" | "unavailable" | "partial" = "unavailable";
  let calendarEvents: Array<{
    id: string | null | undefined;
    title: string;
    start: string | null;
    end: string | null;
  }> = [];

  try {
    const { calendar } = await getGoogleServices(userId);
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: horizon.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
    });

    calendarStatus = response.data.nextPageToken ? "partial" : "available";

    calendarEvents = (response.data.items ?? []).filter((event) =>
      event.status !== "cancelled" && event.transparency !== "transparent" &&
      !event.attendees?.some((attendee) => attendee.self && attendee.responseStatus === "declined")
    ).map((event) => ({
      id: event.id,
      title: event.summary || "Untitled event",
      start: event.start?.dateTime || event.start?.date || null,
      end: event.end?.dateTime || event.end?.date || null,
    }));
  } catch {
    calendarEvents = [];
  }

  return {
    generatedAt: now.toISOString(),
    timezone: process.env.APP_TIMEZONE || "Australia/Darwin",
    summary: briefing.summary,
    lastGmailScanAt: briefing.lastGmailScanAt,
    topPriorities: briefing.topPriorities,
    deadlines: briefing.deadlines,
    emailActions: briefing.emails.map((email) => ({
      id: email.id,
      sender: email.sender,
      subject: email.subject,
      classification: email.classification,
      priority: email.importance,
      deadlineAt: email.deadlineAt?.toISOString() || null,
      recommendedAction: email.recommendedAction,
      whyItMatters: email.whyItMatters,
    })),
    followups: briefing.followups.map((item) => ({
      id: item.id,
      subject: item.subject,
      personCompany: item.personCompany,
      nextFollowupAt: item.nextFollowupAt?.toISOString() || null,
      expectedResponse: item.expectedResponse,
    })),
    tasks: briefing.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueAt: task.dueAt?.toISOString() || null,
      nextAction: task.nextAction,
      status: task.status,
    })),
    calendarEvents,
    calendarStatus,
    calendarHorizon: horizon.toISOString(),
  };
}
