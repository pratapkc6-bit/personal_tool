import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";
import { header, messageText } from "@/lib/email";
import { parseMyobRoster, type ParsedShift } from "@/lib/roster-parser";
import { activity, audit } from "@/lib/audit";

function serialiseShift(shift: ParsedShift) {
  return {
    date: shift.date,
    location: shift.location,
    start: shift.start,
    finish: shift.finish,
    startAt: shift.startAt.toISOString(),
    endAt: shift.endAt.toISOString(),
    sourceKey: shift.sourceKey,
  };
}

export async function syncLatestMyobRoster(userId: string) {
  const { gmail, calendar } = await getGoogleServices(userId);
  const list = await gmail.users.messages.list({
    userId: "me",
    q: '"Roster updated" newer_than:45d',
    maxResults: 10,
  });

  let selected:
    | { id: string; threadId?: string | null; sender: string; subject: string; body: string }
    | undefined;

  for (const item of list.data.messages ?? []) {
    if (!item.id) continue;
    const full = await gmail.users.messages.get({ userId: "me", id: item.id, format: "full" });
    const sender = header(full.data, "From");
    const subject = header(full.data, "Subject");
    if (!/myob|advanced\s*team/i.test(sender + " " + subject)) continue;
    selected = {
      id: item.id,
      threadId: item.threadId,
      sender,
      subject,
      body: messageText(full.data),
    };
    break;
  }

  if (!selected) return { status: "NO_ROSTER_EMAIL", created: 0, updated: 0, removed: 0 };

  const already = await db.rosterImport.findUnique({
    where: { userId_sourceMessageId: { userId, sourceMessageId: selected.id } },
  });
  if (already) return { status: "ALREADY_SYNCED", created: 0, updated: 0, removed: 0 };

  const shifts = parseMyobRoster(selected.body);
  if (shifts.length === 0) {
    await audit({
      userId,
      action: "MYOB_ROSTER_PARSE",
      source: "MYOB",
      sourceRef: selected.id,
      result: "FAILED_NO_SHIFTS",
    });
    throw new Error("MYOB roster email found, but no shifts could be parsed safely.");
  }

  const previousImport = await db.rosterImport.findFirst({
    where: { userId },
    orderBy: { importedAt: "desc" },
  });

  const previousShifts = Array.isArray(previousImport?.shifts) ? previousImport?.shifts as Array<{ sourceKey?: string }> : [];
  const newKeys = new Set(shifts.map((shift) => shift.sourceKey));
  const removedKeys = previousShifts
    .map((shift) => shift.sourceKey)
    .filter((key): key is string => Boolean(key && !newKeys.has(key)));

  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const shift of shifts) {
    const existing = await db.calendarEventLink.findUnique({
      where: {
        userId_sourceType_sourceKey: {
          userId,
          sourceType: "MYOB_ROSTER",
          sourceKey: shift.sourceKey,
        },
      },
    });

    const requestBody = {
      summary: `Work – ${shift.location}`,
      description: "Imported from MYOB roster.",
      start: {
        dateTime: shift.startAt.toISOString(),
        timeZone: process.env.APP_TIMEZONE || "Australia/Darwin",
      },
      end: {
        dateTime: shift.endAt.toISOString(),
        timeZone: process.env.APP_TIMEZONE || "Australia/Darwin",
      },
      extendedProperties: {
        private: {
          secretarySource: "MYOB_ROSTER",
          secretaryCategory: "WORK",
          secretarySourceKey: shift.sourceKey,
        },
      },
    };

    if (!existing) {
      const event = await calendar.events.insert({
        calendarId: "primary",
        requestBody,
      });
      if (!event.data.id) throw new Error("Google Calendar did not return an event ID.");

      await db.calendarEventLink.create({
        data: {
          userId,
          sourceType: "MYOB_ROSTER",
          sourceKey: shift.sourceKey,
          sourceEmailId: selected.id,
          googleEventId: event.data.id,
          sourceDate: new Date(`${shift.date}T00:00:00+09:30`),
          startAt: shift.startAt,
          endAt: shift.endAt,
          metadata: serialiseShift(shift),
        },
      });
      created++;
      continue;
    }

    const changed =
      existing.startAt?.getTime() !== shift.startAt.getTime() ||
      existing.endAt?.getTime() !== shift.endAt.getTime();

    if (changed) {
      await calendar.events.patch({
        calendarId: "primary",
        eventId: existing.googleEventId,
        requestBody,
      });

      await db.calendarEventLink.update({
        where: { id: existing.id },
        data: {
          sourceEmailId: selected.id,
          startAt: shift.startAt,
          endAt: shift.endAt,
          metadata: serialiseShift(shift),
        },
      });
      updated++;
    } else {
      await db.calendarEventLink.update({
        where: { id: existing.id },
        data: { sourceEmailId: selected.id },
      });
    }
  }

  for (const sourceKey of removedKeys) {
    const link = await db.calendarEventLink.findUnique({
      where: {
        userId_sourceType_sourceKey: {
          userId,
          sourceType: "MYOB_ROSTER",
          sourceKey,
        },
      },
    });
    if (!link) continue;

    try {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: link.googleEventId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/404|not found/i.test(message)) throw error;
    }

    await db.calendarEventLink.delete({ where: { id: link.id } });
    removed++;
  }

  const first = shifts[0];
  const last = shifts[shifts.length - 1];
  await db.rosterImport.create({
    data: {
      userId,
      sourceMessageId: selected.id,
      sender: selected.sender,
      subject: selected.subject,
      rosterStart: new Date(`${first.date}T00:00:00+09:30`),
      rosterEnd: new Date(`${last.date}T23:59:59+09:30`),
      shifts: shifts.map(serialiseShift),
      result: { created, updated, removed },
    },
  });

  await activity({
    userId,
    type: "ROSTER",
    summary: `MYOB roster synced: ${created} created, ${updated} updated, ${removed} removed`,
    details: { sourceMessageId: selected.id, created, updated, removed },
  });

  await audit({
    userId,
    action: "MYOB_ROSTER_SYNC",
    source: "MYOB",
    sourceRef: selected.id,
    newState: { shifts: shifts.map(serialiseShift), created, updated, removed },
    result: "SUCCESS",
  });

  return { status: "SYNCED", created, updated, removed, shifts: shifts.map(serialiseShift) };
}
