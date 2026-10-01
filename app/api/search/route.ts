import { getServerSession } from "next-auth";
import { NextRequest,NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";

export async function GET(request:NextRequest){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const q=new URL(request.url).searchParams.get("q")?.trim();
  if(!q)return NextResponse.json({emails:[],tasks:[],followups:[],reminders:[],approvals:[],context:[],events:[]});

  const [emails,tasks,followups,reminders,approvals,context]=await Promise.all([
    db.emailIntelligence.findMany({where:{userId:session.user.id,OR:[
      {subject:{contains:q,mode:"insensitive"}},{sender:{contains:q,mode:"insensitive"}},{snippet:{contains:q,mode:"insensitive"}},
      {whatHappened:{contains:q,mode:"insensitive"}},{recommendedAction:{contains:q,mode:"insensitive"}}
    ]},orderBy:{processedAt:"desc"},take:20}),
    db.task.findMany({where:{userId:session.user.id,OR:[
      {title:{contains:q,mode:"insensitive"}},{category:{contains:q,mode:"insensitive"}},{notes:{contains:q,mode:"insensitive"}},
      {nextAction:{contains:q,mode:"insensitive"}}
    ]},orderBy:{updatedAt:"desc"},take:20}),
    db.followup.findMany({where:{userId:session.user.id,OR:[
      {subject:{contains:q,mode:"insensitive"}},{personCompany:{contains:q,mode:"insensitive"}},{notes:{contains:q,mode:"insensitive"}},
      {expectedResponse:{contains:q,mode:"insensitive"}}
    ]},orderBy:{lastUpdate:"desc"},take:20}),
    db.reminder.findMany({where:{userId:session.user.id,title:{contains:q,mode:"insensitive"}},orderBy:{remindAt:"asc"},take:20}),
    db.actionProposal.findMany({where:{userId:session.user.id,OR:[
      {title:{contains:q,mode:"insensitive"}},{rationale:{contains:q,mode:"insensitive"}},{actionType:{contains:q,mode:"insensitive"}}
    ]},orderBy:{createdAt:"desc"},take:20}),
    db.contextNode.findMany({where:{userId:session.user.id,OR:[
      {label:{contains:q,mode:"insensitive"}},{summary:{contains:q,mode:"insensitive"}},{kind:{contains:q,mode:"insensitive"}}
    ]},orderBy:{lastSeenAt:"desc"},take:20})
  ]);

  let events:unknown[]=[];
  try{
    const {calendar}=await getGoogleServices(session.user.id);
    const result=await calendar.events.list({
      calendarId:"primary",q,
      timeMin:new Date(Date.now()-180*86400000).toISOString(),
      timeMax:new Date(Date.now()+365*86400000).toISOString(),
      singleEvents:true,orderBy:"startTime",maxResults:30
    });
    events=(result.data.items??[]).map(event=>({id:event.id,title:event.summary,start:event.start?.dateTime||event.start?.date}));
  }catch{}

  return NextResponse.json({emails,tasks,followups,reminders,approvals,context,events});
}