export const APP_TIMEZONE=process.env.APP_TIMEZONE||"Australia/Darwin";

export type ZonedDateParts={
  year:number;month:number;day:number;hour:number;minute:number;second:number;
};

export function zonedParts(date:Date,timeZone=APP_TIMEZONE):ZonedDateParts{
  const parts=new Intl.DateTimeFormat("en-AU",{
    timeZone,year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
  }).formatToParts(date);
  const value=(type:string)=>Number(parts.find(part=>part.type===type)?.value||0);
  return {year:value("year"),month:value("month"),day:value("day"),hour:value("hour"),minute:value("minute"),second:value("second")};
}

export function zonedDateTime(parts:ZonedDateParts,timeZone=APP_TIMEZONE){
  const desiredUtc=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);
  let candidate=new Date(desiredUtc);
  for(let i=0;i<4;i++){
    const rendered=zonedParts(candidate,timeZone);
    const renderedUtc=Date.UTC(rendered.year,rendered.month-1,rendered.day,rendered.hour,rendered.minute,rendered.second);
    const correction=desiredUtc-renderedUtc;
    if(Math.abs(correction)<1000)break;
    candidate=new Date(candidate.getTime()+correction);
  }
  return candidate;
}

export function chronoReferenceForTimezone(now=new Date(),timeZone=APP_TIMEZONE){
  const p=zonedParts(now,timeZone);
  return new Date(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second));
}

export function formatZoroDateTime(value:Date|string|number,timeZone=APP_TIMEZONE){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return String(value);
  return new Intl.DateTimeFormat("en-AU",{
    timeZone,dateStyle:"medium",timeStyle:"short"
  }).format(date);
}
