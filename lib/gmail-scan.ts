import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";
import { header, messageText } from "@/lib/email";
import { analyseEmail } from "@/lib/intelligence/email-intelligence";
import { activity, audit } from "@/lib/audit";
import { createAndDeliverAlert, type AlertPriority } from "@/lib/push";
import { loadNotificationSettings, quietHoursActive } from "@/lib/notification-settings";

export async function scanGmail(userId: string, maxResults = 30) {
  const { gmail } = await getGoogleServices(userId);
  const settings = await loadNotificationSettings(userId);
  const quiet = quietHoursActive(settings);
  const list = await gmail.users.messages.list({ userId: "me", maxResults, q: "-in:spam -in:trash" });

  let processed = 0, skipped = 0, pushed = 0;
  const actionItems: Array<{ id: string; subject: string; action: string | null; deadlineAt: string | null }> = [];
  const urgentItems: Array<{ id: string; subject: string; sender: string | null; priority: string }> = [];

  for (const item of list.data.messages ?? []) {
    if (!item.id) continue;
    const exists = await db.emailIntelligence.findUnique({ where: { userId_gmailMessageId: { userId, gmailMessageId: item.id } }, select: { id: true } });
    if (exists) { skipped++; continue; }

    const full = await gmail.users.messages.get({ userId: "me", id: item.id, format: "full" });
    const sender = header(full.data, "From"), subject = header(full.data, "Subject"), dateHeader = header(full.data, "Date"), body = messageText(full.data);
    const parsedReceivedAt = dateHeader ? new Date(dateHeader) : null;
    const receivedAt = parsedReceivedAt && Number.isFinite(parsedReceivedAt.getTime()) ? parsedReceivedAt : null;
    const intelligence = analyseEmail({ sender, subject, body, receivedAt });

    const saved = await db.emailIntelligence.create({
      data: { userId, gmailMessageId: item.id, threadId: item.threadId ?? undefined, sender, subject, snippet: full.data.snippet ?? body.slice(0, 500), classification: intelligence.classification, requiresAction: intelligence.requiresAction, importance: intelligence.priority, deadlineAt: intelligence.deadlineAt ?? undefined, whatHappened: intelligence.whatHappened, whyItMatters: intelligence.whyItMatters, recommendedAction: intelligence.recommendedAction, receivedAt: receivedAt ?? undefined },
    });

    if (saved.requiresAction) actionItems.push({ id: saved.id, subject: saved.subject || "Email", action: saved.recommendedAction, deadlineAt: saved.deadlineAt?.toISOString() || null });

    const important = saved.requiresAction || saved.classification === "SECURITY" || saved.importance === "URGENT";
    if (important) {
      urgentItems.push({ id: saved.id, subject: saved.subject || "Important email", sender: saved.sender, priority: saved.importance });
      if (settings.masterEnabled && settings.categories.importantGmail) {
        const priority: AlertPriority = saved.classification === "SECURITY" || saved.importance === "URGENT" ? "CRITICAL" : saved.importance === "HIGH" ? "IMPORTANT" : "NORMAL";
        const deliverPush = settings.pushEnabled && (!quiet || (priority === "CRITICAL" && settings.quietHours.allowUrgent));
        const result = await createAndDeliverAlert({ userId, type: saved.classification === "SECURITY" ? "SECURITY_ALERT" : "IMPORTANT_EMAIL", category: "importantGmail", priority, title: saved.subject || "Important email", body: saved.recommendedAction || saved.whyItMatters || "Review this message.", dedupeKey: `email:${item.id}`, source: "Gmail", sourceRef: item.id, url: "/inbox", deliverPush });
        pushed += result.pushed;
      }
    }
    processed++;
  }

  await db.setting.upsert({ where: { userId_key: { userId, key: "gmail_last_scan" } }, update: { value: { at: new Date().toISOString() } }, create: { userId, key: "gmail_last_scan", value: { at: new Date().toISOString() } } });

  if (processed > 0) {
    await activity({ userId, type: "GMAIL_SCAN", summary: `${processed} new email${processed === 1 ? "" : "s"} processed`, details: { processed, skipped, actionRequired: actionItems.length, urgent: urgentItems.length, pushed } });
    await audit({ userId, action: "GMAIL_SCAN", source: "Gmail", newState: { processed, skipped, actionRequired: actionItems.length, urgent: urgentItems.length, pushed }, result: "SUCCESS" });
  }

  return { processed, skipped, actionItems, urgentItems, pushed };
}
