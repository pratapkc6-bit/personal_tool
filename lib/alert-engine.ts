import { createRequire } from "node:module";
import { db } from "@/lib/db";
import { createAndDeliverAlert, type AlertPriority } from "@/lib/push";
import { getNtHolidays } from "@/lib/nt-holidays";
import { loadNotificationSettings, quietHoursActive, type NotificationCategory } from "@/lib/notification-settings";

const require=createRequire(import.meta.url);
const TZ=process.env.APP_TIMEZONE||"Australia/Darwin";

function localDate(now:Date){
  return new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
function localHour(now:Date){
  return Number(new Intl.DateTimeFormat("en-AU",{timeZone:TZ,hour:"2-digit",hour12:false}).format(now));
}
function addDays(date:string,days:number){const d=new Date(date+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function fmt(date:Date|null|undefined){return date?new Intl.DateTimeFormat("en-AU",{timeZone:TZ,dateStyle:"medium",timeStyle:"short"}).format(date):""}
function textItems(value:unknown){
  const list=Array.isArray(value)?value:value?[value]:[];
  return list.map(item=>typeof item==="string"?item:(item&&typeof item==="object"?String((item as Record<string,unknown>).name_np||(item as Record<string,unknown>).name||(item as Record<string,unknown>).title_np||(item as Record<string,unknown>).title||""):"")).filter(Boolean);
}

async function severeWeather(){
  try{
    const u=new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude",String(Number(process.env.APP_WEATHER_LAT||-12.4634)));
    u.searchParams.set("longitude",String(Number(process.env.APP_WEATHER_LONG||130.8456)));
    u.searchParams.set("timezone",TZ);
    u.searchParams.set("forecast_days","1");
    u.searchParams.set("daily","weather_code,precipitation_probability_max,precipitation_sum,wind_speed_10m_max");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
    try{
      const response=await fetch(u,{signal:controller.signal});if(!response.ok)return null;
      const j=await response.json(),d=j.daily||{},code=Number(d.weather_code?.[0]||0),rain=Number(d.precipitation_probability_max?.[0]||0),mm=Number(d.precipitation_sum?.[0]||0),wind=Number(d.wind_speed_10m_max?.[0]||0);
      if(code>=95||wind>=60||(rain>=80&&mm>=20))return {code,rain,mm,wind};
      return null;
    }finally{clearTimeout(timer)}
  }catch{return null}
}

function nepaliDay(){
  try{
    const patro=require("@namlo/nepali-calendar") as {
      getToday:(d?:Date)=>Record<string,unknown>;getBsDay:(y:number,m:number,d:number)=>Record<string,unknown>
    };
    const today=patro.getToday(new Date()),year=Number(today.year),month=Number(today.month),day=Number(today.gatey||today.day);
    const detail=patro.getBsDay(year,month,day);
    const labels=[...textItems(detail.holidays),...textItems(detail.events)];
    const tithi=Number(detail.tithi||0);
    if(tithi===15)labels.unshift("पूर्णिमा · Purnima");
    if(tithi===30)labels.unshift("औँसी · Aunsi");
    if(tithi===11||tithi===26)labels.unshift("एकादशी · Ekadashi");
    return {year,month,day,labels:[...new Set(labels)]};
  }catch{return null}
}

export async function runAlertEngine(userId:string){
  const settings=await loadNotificationSettings(userId);
  if(!settings.masterEnabled)return {enabled:false,created:0,pushed:0,checked:0};
  const now=new Date(),today=localDate(now),tomorrow=addDays(today,1),hour=localHour(now);
  const quiet=quietHoursActive(settings,now,TZ);
  let created=0,pushed=0,checked=0;

  async function emit(category:NotificationCategory,input:{
    type:string;priority:AlertPriority;title:string;body:string;dedupeKey:string;source?:string;sourceRef?:string;url?:string;alarmSeconds?:number
  }){
    checked++;
    if(!settings.categories[category])return;
    const urgent=input.priority==="CRITICAL";
    const deliverPush=settings.pushEnabled&&(!quiet||(urgent&&settings.quietHours.allowUrgent));
    const result=await createAndDeliverAlert({userId,category,deliverPush,...input});
    if(result.created)created++;pushed+=result.pushed;
  }

  const reminders=await db.reminder.findMany({where:{userId,status:"OPEN"},orderBy:{remindAt:"asc"},take:60});
  for(const reminder of reminders){
    const effective=reminder.snoozedUntil||reminder.remindAt;
    if(effective>now)continue;
    await emit("personalReminders",{
      type:"REMINDER_DUE",priority:"CRITICAL",title:"⏰ "+reminder.title,
      body:"Your reminder is due now.",dedupeKey:`reminder:${reminder.id}:${effective.toISOString()}`,
      source:"Reminder",sourceRef:reminder.id,url:"/notifications",alarmSeconds:settings.alarmEnabled?Math.min(reminder.ringSeconds||settings.alarmSeconds,10):0
    });
    await db.reminder.update({where:{id:reminder.id},data:{status:"FIRED",snoozedUntil:null}});
  }

  const next24=new Date(now.getTime()+24*3600_000);
  const tasks=await db.task.findMany({where:{userId,status:{in:["OPEN","WAITING"]},dueAt:{lte:next24}},orderBy:{dueAt:"asc"},take:40});
  for(const task of tasks){
    const overdue=Boolean(task.dueAt&&task.dueAt<now),priority:AlertPriority=task.priority==="URGENT"?"CRITICAL":task.priority==="HIGH"?"IMPORTANT":"NORMAL";
    await emit("deadlines",{type:"TASK_DEADLINE",priority,title:overdue?"Task overdue":"Task due soon",body:`${task.title}${task.dueAt?" · "+fmt(task.dueAt):""}`,dedupeKey:`task:${task.id}:${task.dueAt?.toISOString()||"open"}`,source:"Task",sourceRef:task.id,url:"/tasks"});
  }

  const recent=new Date(now.getTime()-6*3600_000);
  const emails=await db.emailIntelligence.findMany({where:{userId,requiresAction:true,importance:{in:["URGENT","HIGH"]},processedAt:{gte:recent}},orderBy:{processedAt:"desc"},take:30});
  for(const email of emails){
    await emit("importantGmail",{type:"IMPORTANT_EMAIL",priority:email.importance==="URGENT"?"CRITICAL":"IMPORTANT",title:email.subject||"Important email",body:email.recommendedAction||email.whyItMatters||email.whatHappened||"This email needs your attention.",dedupeKey:`email:${email.gmailMessageId}`,source:"Gmail",sourceRef:email.gmailMessageId,url:"/inbox"});
  }

  const followups=await db.followup.findMany({where:{userId,status:"OPEN",nextFollowupAt:{lte:next24}},orderBy:{nextFollowupAt:"asc"},take:30});
  for(const item of followups){
    await emit("followups",{type:"FOLLOWUP_DUE",priority:item.nextFollowupAt&&item.nextFollowupAt<now?"IMPORTANT":"NORMAL",title:"Follow-up: "+item.subject,body:item.expectedResponse||"Check whether a response or update has arrived.",dedupeKey:`followup:${item.id}:${item.nextFollowupAt?.toISOString()||"open"}`,source:"Follow-up",sourceRef:item.id,url:"/tasks"});
  }

  const calendar=await db.calendarEventLink.findMany({where:{userId,startAt:{gte:now,lte:new Date(now.getTime()+2*3600_000)}},orderBy:{startAt:"asc"},take:20});
  for(const event of calendar){
    await emit("calendar",{type:"CALENDAR_SOON",priority:"NORMAL",title:"Calendar event coming up",body:`${String((event.metadata as Record<string,unknown>|null)?.summary||event.sourceType)} · ${fmt(event.startAt)}`,dedupeKey:`calendar:${event.googleEventId}:${event.startAt?.toISOString()||""}`,source:"Google Calendar",sourceRef:event.googleEventId,url:"/calendar"});
  }

  if(hour>=6&&hour<=9){
    for(const holiday of getNtHolidays(today)){
      await emit("ntHolidays",{type:"NT_HOLIDAY_TODAY",priority:"NORMAL",title:"🇦🇺 "+holiday.title,body:holiday.kind==="regional"?"Darwin regional public holiday today.":holiday.kind==="part-day"?"NT part-day public holiday today from 7 pm.":"Northern Territory public holiday today.",dedupeKey:`nt-holiday:today:${holiday.date}:${holiday.title}`,source:"NT holiday calendar",sourceRef:holiday.date,url:"/notifications"});
    }
    const np=nepaliDay();
    if(np?.labels.length)await emit("nepaliCalendar",{type:"NEPALI_CALENDAR",priority:"NORMAL",title:"🇳🇵 "+np.labels[0],body:np.labels.slice(1).join(" · ")||`Nepali calendar special day · BS ${np.year}-${np.month}-${np.day}`,dedupeKey:`nepali:${today}:${np.labels.join("|")}`,source:"Nepali Patro",sourceRef:today,url:"/notifications"});
  }
  if(hour>=18&&hour<=21){
    for(const holiday of getNtHolidays(tomorrow)){
      await emit("ntHolidays",{type:"NT_HOLIDAY_TOMORROW",priority:"NORMAL",title:"Tomorrow: "+holiday.title,body:holiday.kind==="regional"?"Darwin regional public holiday tomorrow.":"Northern Territory public holiday tomorrow.",dedupeKey:`nt-holiday:tomorrow:${holiday.date}:${holiday.title}`,source:"NT holiday calendar",sourceRef:holiday.date,url:"/notifications"});
    }
  }

  const weather=await severeWeather();
  if(weather)await emit("weather",{type:"DARWIN_WEATHER_WATCH",priority:weather.code>=95||weather.wind>=80?"CRITICAL":"IMPORTANT",title:"⛈️ Darwin weather watch",body:`Rain chance ${weather.rain}% · ${weather.mm} mm · wind up to ${weather.wind} km/h. Check current BOM warnings if conditions worsen.`,dedupeKey:`weather:${today}:${weather.code}:${Math.round(weather.wind/10)*10}:${Math.round(weather.mm/10)*10}`,source:"Open-Meteo",sourceRef:today,url:"/notifications"});

  return {enabled:true,created,pushed,checked,quiet};
}
