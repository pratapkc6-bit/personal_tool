import { createRequire } from "node:module";
import { normalizeAssistantInput } from "@/lib/intelligence/local-assistant";

const require = createRequire(import.meta.url);
const patro: any = require("@namlo/nepali-calendar");

function textArray(value: unknown) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw.map((item: any) =>
    typeof item === "string"
      ? item
      : String(item?.name_np || item?.name || item?.title_np || item?.title || "")
  ).filter(Boolean);
}

function targetDateFromMessage(message: string) {
  const understood = normalizeAssistantInput(message);
  const now = new Date();
  if (/\btomorrow\b/i.test(understood)) return new Date(now.getTime() + 86_400_000);
  if (/\byesterday\b/i.test(understood)) return new Date(now.getTime() - 86_400_000);
  return now;
}

export function isPatroIntent(message: string) {
  const understood = normalizeAssistantInput(message);
  return /\b(nepali\s+(?:patro|calendar|date)|patro|bikram\s+sambat|bs\s+date|tithi|nepali\s+festival)\b/i.test(understood);
}

export function answerPatro(message: string) {
  if (!isPatroIntent(message)) return null;

  const understood = normalizeAssistantInput(message);
  const bsMatch = /\b(20\d{2})[\s\/-]+(\d{1,2})[\s\/-]+(\d{1,2})\b/.exec(understood);
  let day: any;

  if (bsMatch && /\b(?:bs|bikram|nepali|patro)\b/i.test(understood)) {
    day = patro.getBsDay(Number(bsMatch[1]), Number(bsMatch[2]), Number(bsMatch[3]));
  } else {
    const target = targetDateFromMessage(message);
    const today = patro.getToday(target);
    day = patro.getBsDay(Number(today.year), Number(today.month), Number(today.gatey || today.day));
  }

  if (!day) return "I couldn't read that Nepali Patro date.";

  const year = Number(day.year);
  const month = Number(day.month);
  const gatey = Number(day.gatey || day.day);
  const monthEn = patro.BS_MONTHS_EN?.[month - 1] || `month ${month}`;
  const monthNp = patro.BS_MONTHS_NP?.[month - 1] || "";
  const weekday = patro.WEEKDAYS_EN?.[day.weekday] || "";
  const tithi = day.panchang?.tithiName || "";
  const tithiNp = day.panchang?.tithiNameNp || "";
  const holidays = textArray(day.holidays);
  const events = textArray(day.events);
  const items = [...new Set([...holidays, ...events])];

  const dateLabel = `${year} ${monthEn} ${gatey}${monthNp ? ` (${monthNp})` : ""}`;
  const parts = [`Nepali Patro: ${dateLabel}${weekday ? ` · ${weekday}` : ""}.`];

  if (tithi || tithiNp) {
    parts.push(`Tithi: ${tithiNp || tithi}${tithi && tithiNp ? ` (${tithi})` : ""}.`);
  }

  if (items.length) parts.push(`On this day: ${items.join(" · ")}.`);
  else parts.push("No holiday or festival is recorded for that day in the local Patro data.");

  if (day.ad) parts.push(`Gregorian date: ${day.ad}.`);

  return parts.join(" ");
}
