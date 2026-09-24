import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";
import { classifyEmail, header, messageText } from "@/lib/email";
import { activity, audit } from "@/lib/audit";

export async function scanGmail(userId: string, maxResults = 30) {
  const { gmail } = await getGoogleServices(userId);
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "-in:spam -in:trash",
  });

  let processed = 0;
  let skipped = 0;
  const actionItems: Array<{ id: string; subject: string; action: string | null }> = [];

  for (const item of list.data.messages ?? []) {
    if (!item.id) continue;

    const exists = await db.emailIntelligence.findUnique({
      where: { userId_gmailMessageId: { userId, gmailMessageId: item.id } },
      select: { id: true },
    });
    if (exists) {
      skipped++;
      continue;
    }

    const full = await gmail.users.messages.get({
      userId: "me",
      id: item.id,
      format: "full",
    });

    const sender = header(full.data, "From");
    const subject = header(full.data, "Subject");
    const dateHeader = header(full.data, "Date");
    const body = messageText(full.data);
    const intelligence = classifyEmail({ sender, subject, body });

    const saved = await db.emailIntelligence.create({
      data: {
        userId,
        gmailMessageId: item.id,
        threadId: item.threadId ?? undefined,
        sender,
        subject,
        snippet: full.data.snippet ?? body.slice(0, 500),
        classification: intelligence.classification,
        requiresAction: intelligence.requiresAction,
        importance: intelligence.priority,
        whatHappened: intelligence.whatHappened,
        whyItMatters: intelligence.whyItMatters,
        recommendedAction: intelligence.recommendedAction,
        receivedAt: dateHeader ? new Date(dateHeader) : undefined,
      },
    });

    if (saved.requiresAction) {
      actionItems.push({
        id: saved.id,
        subject: saved.subject || "Email",
        action: saved.recommendedAction,
      });
    }

    if (saved.requiresAction || saved.classification === "SECURITY") {
      await db.notification.upsert({
        where: {
          userId_dedupeKey: {
            userId,
            dedupeKey: `email:${item.id}`,
          },
        },
        update: {},
        create: {
          userId,
          type: saved.classification === "SECURITY" ? "SECURITY_ALERT" : "IMPORTANT_EMAIL",
          title: saved.subject || "Important email",
          body: saved.recommendedAction || saved.whyItMatters || "Review this message.",
          dedupeKey: `email:${item.id}`,
        },
      });
    }

    processed++;
  }

  await db.setting.upsert({
    where: { userId_key: { userId, key: "gmail_last_scan" } },
    update: { value: { at: new Date().toISOString() } },
    create: { userId, key: "gmail_last_scan", value: { at: new Date().toISOString() } },
  });

  if (processed > 0) {
    await activity({
      userId,
      type: "GMAIL_SCAN",
      summary: `${processed} new email${processed === 1 ? "" : "s"} processed`,
      details: { processed, skipped, actionRequired: actionItems.length },
    });
    await audit({
      userId,
      action: "GMAIL_SCAN",
      source: "Gmail",
      newState: { processed, skipped, actionRequired: actionItems.length },
      result: "SUCCESS",
    });
  }

  return { processed, skipped, actionItems };
}
