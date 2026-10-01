import * as chrono from "chrono-node";

export type CaptureInterpretation={
  mode:"task"|"reminder";
  title:string;
  priority:"URGENT"|"HIGH"|"MEDIUM"|"LOW";
  category:string;
  dueAt:string|null;
  remindAt:string|null;
  recurrence:"NONE"|"DAILY";
  recurrenceTime:string|null;
  confidence:number;
  notes:string[];
};

const priorityFrom=(text:string):CaptureInterpretation["priority"]=>{
  const t=text.toLowerCase();
  if(/\b(urgent|asap|immediately|right away)\b/.test(t))return "URGENT";
  if(/\b(important|high priority|must do)\b/.test(t))return "HIGH";
  if(/\b(low priority|whenever|someday)\b/.test(t))return "LOW";
  return "MEDIUM";
};
const categoryFrom=(text:string)=>{
  const t=text.toLowerCase();
  if(/\b(work|job|shift|roster|manager|client)\b/.test(t))return "WORK";
  if(/\b(study|class|assignment|exam|course|nit|py)\b/.test(t))return "STUDY";
  if(/\b(email|reply|call|follow up|follow-up)\b/.test(t))return "COMMUNICATION";
  if(/\b(bill|pay|rent|bank|money|insurance)\b/.test(t))return "FINANCE";
  if(/\b(doctor|medicine|medication|appointment|workout|gym)\b/.test(t))return "HEALTH";
  return "PERSONAL";
};
const cleanTitle=(text:string,match?:chrono.ParsedResult)=>{
  let title=text;
  if(match){
    title=(text.slice(0,match.index)+" "+text.slice(match.index+match.text.length)).replace(/\s+/g," ").trim();
  }
  title=title
    .replace(/^\s*(remind me(?: to)?|reminder(?: to)?|remember to|task(?: to)?|todo(?: to)?)\s+/i,"")
    .replace(/\b(every day|daily|each day)\b/ig,"")
    .replace(/\b(urgent|asap|immediately|right away|high priority|low priority)\b/ig,"")
    .replace(/\s+/g," ")
    .trim();
  return title.replace(/[,.\-–]+$/,"").trim()||"Untitled";
};

export function interpretCapture(text:string,now=new Date()):CaptureInterpretation{
  const raw=text.trim();
  const DARWIN_OFFSET_MINUTES=570;
  const darwinWallClock=new Date(now.getTime()+DARWIN_OFFSET_MINUTES*60_000);
  const parsed=chrono.parse(raw,darwinWallClock,{forwardDate:true})[0];
  const parsedWallDate=parsed?.start?.date();
  const parsedDate=parsedWallDate?new Date(parsedWallDate.getTime()-DARWIN_OFFSET_MINUTES*60_000):undefined;
  const daily=/\b(every day|daily|each day)\b/i.test(raw);
  const reminderIntent=/\b(remind|reminder|remember)\b/i.test(raw)||daily;
  const mode:CaptureInterpretation["mode"]=reminderIntent?"reminder":"task";
  const iso=parsedDate&&Number.isFinite(parsedDate.getTime())?parsedDate.toISOString():null;
  const recurrenceTime=daily&&parsedWallDate?`${String(parsedWallDate.getHours()).padStart(2,"0")}:${String(parsedWallDate.getMinutes()).padStart(2,"0")}`:null;
  const notes:string[]=[];
  if(parsedDate)notes.push("Detected a date/time.");
  if(daily)notes.push("Detected a daily recurrence.");
  if(priorityFrom(raw)!=="MEDIUM")notes.push("Detected explicit priority.");
  return {
    mode,
    title:cleanTitle(raw,parsed),
    priority:priorityFrom(raw),
    category:categoryFrom(raw),
    dueAt:mode==="task"?iso:null,
    remindAt:mode==="reminder"?iso:null,
    recurrence:daily?"DAILY":"NONE",
    recurrenceTime,
    confidence:Math.min(1,.55+(parsedDate?.getTime()?0.25:0)+(reminderIntent?0.1:0)+(daily?0.1:0)),
    notes
  };
}
