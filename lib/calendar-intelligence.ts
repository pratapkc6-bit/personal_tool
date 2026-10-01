export type CalendarSignalEvent={
  id:string;
  title:string;
  start:string;
  end:string;
  allDay?:boolean;
};

export type CalendarIntelligence={
  nextEvent:CalendarSignalEvent|null;
  activeEvent:CalendarSignalEvent|null;
  conflicts:Array<{first:string;second:string;start:string}>;
  freeBlocks:Array<{start:string;end:string;minutes:number}>;
  shortGaps:Array<{start:string;end:string;minutes:number}>;
  eventCount:number;
  allDayCount:number;
  timedCount:number;
  busyMinutes:number;
  loadScore:number;
};

export function analyzeCalendar(events:CalendarSignalEvent[],now=new Date(),dayStartHour=8,dayEndHour=20):CalendarIntelligence{
  const sorted=[...events].filter(e=>Date.parse(e.start)&&Date.parse(e.end)).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
  const activeEvent=sorted.find(e=>Date.parse(e.start)<=now.getTime()&&Date.parse(e.end)>now.getTime())||null;
  const nextEvent=sorted.find(e=>Date.parse(e.start)>now.getTime())||null;
  const timed=sorted.filter(e=>!e.allDay);
  const conflicts:Array<{first:string;second:string;start:string}>=[];
  for(let i=0;i<timed.length-1;i++){
    if(Date.parse(timed[i+1].start)<Date.parse(timed[i].end)){
      conflicts.push({first:timed[i].title,second:timed[i+1].title,start:timed[i+1].start});
    }
  }

  const day=new Date(now);
  const start=new Date(day);start.setHours(dayStartHour,0,0,0);
  const end=new Date(day);end.setHours(dayEndHour,0,0,0);
  const todaysTimed=timed
    .map(e=>({event:e,start:Math.max(Date.parse(e.start),start.getTime()),end:Math.min(Date.parse(e.end),end.getTime())}))
    .filter(x=>x.end>x.start)
    .sort((a,b)=>a.start-b.start);

  const merged:Array<{start:number;end:number}>=[];
  for(const x of todaysTimed){
    const last=merged[merged.length-1];
    if(last&&x.start<=last.end)last.end=Math.max(last.end,x.end);
    else merged.push({start:x.start,end:x.end});
  }

  const freeBlocks:Array<{start:string;end:string;minutes:number}>=[];
  const shortGaps:Array<{start:string;end:string;minutes:number}>=[];
  let cursor=Math.max(start.getTime(),now.getTime());
  for(const block of merged){
    if(block.end<=cursor)continue;
    if(block.start>cursor){
      const minutes=Math.round((block.start-cursor)/60000);
      const target={start:new Date(cursor).toISOString(),end:new Date(block.start).toISOString(),minutes};
      if(minutes>=30)freeBlocks.push(target); else shortGaps.push(target);
    }
    cursor=Math.max(cursor,block.end);
  }
  if(cursor<end.getTime()){
    const minutes=Math.round((end.getTime()-cursor)/60000);
    const target={start:new Date(cursor).toISOString(),end:end.toISOString(),minutes};
    if(minutes>=30)freeBlocks.push(target); else if(minutes>0)shortGaps.push(target);
  }

  const busyMinutes=merged.reduce((sum,x)=>sum+Math.round((x.end-x.start)/60000),0);
  const available=Math.max(1,(dayEndHour-dayStartHour)*60);
  const loadScore=Math.min(100,Math.round((busyMinutes/available)*100));

  return {
    nextEvent,activeEvent,conflicts,freeBlocks,shortGaps,
    eventCount:sorted.length,allDayCount:sorted.filter(e=>e.allDay).length,timedCount:timed.length,
    busyMinutes,loadScore
  };
}