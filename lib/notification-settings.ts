import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type NotificationCategory =
  | "ntHolidays"
  | "nepaliCalendar"
  | "importantGmail"
  | "deadlines"
  | "followups"
  | "calendar"
  | "weather"
  | "personalReminders";

export type NotificationSettings = {
  masterEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  alarmEnabled: boolean;
  alarmSeconds: number;
  quietHours: { enabled: boolean; start: string; end: string; allowUrgent: boolean };
  categories: Record<NotificationCategory, boolean>;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  masterEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  alarmEnabled: true,
  alarmSeconds: 3,
  quietHours: { enabled: true, start: "22:00", end: "06:00", allowUrgent: true },
  categories: {
    ntHolidays: true,
    nepaliCalendar: true,
    importantGmail: true,
    deadlines: true,
    followups: true,
    calendar: true,
    weather: true,
    personalReminders: true,
  },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value==="object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function bool(value: unknown, fallback: boolean) { return typeof value==="boolean" ? value : fallback; }
function str(value: unknown, fallback: string) { return typeof value==="string" ? value : fallback; }
function num(value: unknown, fallback: number) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }

export function normaliseNotificationSettings(value: unknown): NotificationSettings {
  const root=record(value), q=record(root.quietHours), categories=record(root.categories);
  const defaults=DEFAULT_NOTIFICATION_SETTINGS;
  return {
    masterEnabled: bool(root.masterEnabled,defaults.masterEnabled),
    pushEnabled: bool(root.pushEnabled,defaults.pushEnabled),
    inAppEnabled: bool(root.inAppEnabled,defaults.inAppEnabled),
    alarmEnabled: bool(root.alarmEnabled,defaults.alarmEnabled),
    alarmSeconds: Math.min(10,Math.max(0,num(root.alarmSeconds,defaults.alarmSeconds))),
    quietHours: {
      enabled: bool(q.enabled,defaults.quietHours.enabled),
      start: str(q.start,defaults.quietHours.start),
      end: str(q.end,defaults.quietHours.end),
      allowUrgent: bool(q.allowUrgent,defaults.quietHours.allowUrgent),
    },
    categories: Object.fromEntries(
      Object.entries(defaults.categories).map(([key,fallback])=>[key,bool(categories[key],fallback)])
    ) as NotificationSettings["categories"],
  };
}

export async function loadNotificationSettings(userId: string) {
  const item=await db.setting.findUnique({where:{userId_key:{userId,key:"notification_preferences"}}});
  return normaliseNotificationSettings(item?.value);
}

export async function saveNotificationSettings(userId: string, value: unknown) {
  const settings=normaliseNotificationSettings(value);
  await db.setting.upsert({
    where:{userId_key:{userId,key:"notification_preferences"}},
    create:{userId,key:"notification_preferences",value:settings as unknown as Prisma.InputJsonValue},
    update:{value:settings as unknown as Prisma.InputJsonValue},
  });
  return settings;
}

function minutes(value: string) {
  const match=/^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1])*60+Number(match[2]) : 0;
}

export function quietHoursActive(settings: NotificationSettings, now=new Date(), timeZone=process.env.APP_TIMEZONE||"Australia/Darwin") {
  if(!settings.quietHours.enabled) return false;
  const parts=new Intl.DateTimeFormat("en-AU",{timeZone,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(now);
  const h=Number(parts.find(p=>p.type==="hour")?.value||0), m=Number(parts.find(p=>p.type==="minute")?.value||0);
  const current=h*60+m,start=minutes(settings.quietHours.start),end=minutes(settings.quietHours.end);
  return start===end ? false : start<end ? current>=start&&current<end : current>=start||current<end;
}

export function vapidConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);
}
