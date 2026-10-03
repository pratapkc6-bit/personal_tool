import type { AssistantContext } from "@/lib/intelligence/context-builder";
import type { AssistantHistoryMessage } from "@/lib/intelligence/local-assistant";

const DEFAULT_MODEL=process.env.OPENAI_MODEL||"gpt-6-luna";
const SMART_MODEL=process.env.OPENAI_SMART_MODEL||DEFAULT_MODEL;
const OPENAI_URL="https://api.openai.com/v1/responses";

export type OpenAIAnswer={
  text:string;
  model:string;
  usage?:{inputTokens?:number;outputTokens?:number;totalTokens?:number};
};

export type OpenAIRoute={
  model:string;
  reasoningEffort:"low"|"medium"|"high";
  verbosity:"low"|"medium";
  maxOutputTokens:number;
  mode:"quick"|"standard"|"deep";
};

export function openAIConfigured(){
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function chooseOpenAIRoute(message:string):OpenAIRoute{
  const text=message.trim();
  const deep=/\b(analy[sz]e|compare|strategy|trade-?off|pros and cons|prioriti[sz]e|plan my (day|week)|what should i do and why|decision|evaluate|deep|reason through|conflict|schedule around|best approach)\b/i.test(text);
  const quick=/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|who are you|what can you do)[.!?\s]*$/i.test(text) ||
    text.length<80 && /\b(when|where|what time|how many|which one)\b/i.test(text);

  if(deep){
    return {model:SMART_MODEL,reasoningEffort:"high",verbosity:"medium",maxOutputTokens:1400,mode:"deep"};
  }
  if(quick){
    return {model:DEFAULT_MODEL,reasoningEffort:"low",verbosity:"low",maxOutputTokens:650,mode:"quick"};
  }
  return {model:DEFAULT_MODEL,reasoningEffort:"medium",verbosity:"medium",maxOutputTokens:1000,mode:"standard"};
}

export function chooseOpenAIModel(message:string){
  return chooseOpenAIRoute(message).model;
}

export function compactAssistantContext(context:AssistantContext){
  return {
    generatedAt:context.generatedAt,
    timezone:context.timezone,
    localNow:context.localNow,
    appLayout:context.appLayout,
    personalProfile:{
      status:context.personalProfile.status,
      syncedAt:context.personalProfile.syncedAt,
      modifiedTime:context.personalProfile.modifiedTime,
      content:context.personalProfile.content
    },
    lastGmailScanAt:context.lastGmailScanAt,
    calendarStatus:context.calendarStatus,
    calendarHorizon:context.calendarHorizon,
    summary:context.summary,
    priorities:context.topPriorities.slice(0,5).map(x=>({
      title:x.title,priority:x.priority,dueAt:x.dueAt,nextAction:x.nextAction,reason:x.reason
    })),
    deadlines:context.deadlines.slice(0,8).map(x=>({
      title:x.title,priority:x.priority,dueAt:x.dueAt,nextAction:x.nextAction
    })),
    emailActions:context.emailActions.slice(0,8).map(x=>({
      sender:x.sender,subject:x.subject,classification:x.classification,priority:x.priority,
      deadlineAt:x.deadlineAt,recommendedAction:x.recommendedAction,whyItMatters:x.whyItMatters
    })),
    followups:context.followups.slice(0,8),
    tasks:context.tasks.slice(0,12),
    calendarEvents:context.calendarEvents.slice(0,20)
  };
}

export function buildZoroInstructions(context:AssistantContext){
  const snapshot=JSON.stringify(compactAssistantContext(context));
  return [
    "You are Zoro, a private personal AI secretary.",
    "Be concise, practical, specific, and calm. Prefer a clear next action over generic advice.",
    "Use the supplied Zoro context as the source of truth for the user's personal tasks, email intelligence, follow-ups, deadlines, calendar, private profile, and Zoro app layout.",
    "Use the appLayout map when the user asks where a feature is or how to navigate Zoro. Name the exact visible label and route.",
    "Use personalProfile for stable background and preferences. Do not treat old profile text as proof of a current task, deadline, account state, or live status; use the live context fields for those.",
    "Reason carefully about dates, deadlines, schedule conflicts, freshness, and dependencies before answering planning questions.",
    "Distinguish known facts from suggestions or estimates. Never turn missing context into a claim that something does not exist.",
    "When relative dates such as today, tomorrow, or next week could be confusing, anchor the answer with an exact date.",
    "For priorities, explain the most important reason in one short sentence and give the next concrete action.",
    "If two pieces of context conflict, call out the conflict and prefer the newer timestamp rather than silently guessing.",
    "If the user asks for a current external fact that is not present in Zoro context, say a live lookup is needed instead of inventing an answer.",
    "Never invent an email, event, deadline, task, status, person, or completed action that is not in the supplied context.",
    "If the context says Calendar is unavailable or partial, state that limitation instead of claiming the user is free.",
    "Zoro has a deterministic tool layer for Gmail scanning, email drafting and sending, Calendar events, tasks, reminders, alarms, push notifications, and MYOB roster sync.",
    "When the user asks to perform one of those actions, identify the required tool and state any genuinely missing detail.",
    "Never claim an external action completed unless the tool layer reports success. Email sends, Calendar writes, reminders, alarms, tasks, and roster changes require confirmation.",
    "Zoro's deterministic action layer handles writes and confirmation separately.",
    "Do not expose private chain-of-thought. Give concise conclusions, reasons, and actionable steps only.",
    "The user's operating timezone is "+context.timezone+". Current local time in that timezone: "+context.localNow+".",
    "All reminder/calendar times you mention must be interpreted and displayed in the operating timezone unless the user explicitly names another timezone.",
    "Personal context snapshot follows. It contains summaries, not raw Gmail bodies:",
    snapshot
  ].join("\n");
}

function extractOutputText(response:unknown){
  if(!response||typeof response!=="object")return "";
  const root=response as {output?:unknown[]};
  const chunks:string[]=[];
  for(const item of root.output||[]){
    if(!item||typeof item!=="object")continue;
    const content=(item as {content?:unknown[]}).content;
    if(!Array.isArray(content))continue;
    for(const part of content){
      if(part&&typeof part==="object"&&(part as {type?:string}).type==="output_text"&&typeof (part as {text?:unknown}).text==="string"){
        chunks.push((part as {text:string}).text);
      }
    }
  }
  return chunks.join("\n").trim();
}

export async function answerWithOpenAI(
  message:string,
  context:AssistantContext,
  history:AssistantHistoryMessage[]=[]
):Promise<OpenAIAnswer|null>{
  const key=process.env.OPENAI_API_KEY?.trim();
  if(!key)return null;

  const route=chooseOpenAIRoute(message);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),22_000);
  try{
    const input=[
      ...history.slice(-12).map(item=>({role:item.role,content:item.text.slice(0,2500)})),
      {role:"user" as const,content:message.slice(0,4000)}
    ];
    const response=await fetch(OPENAI_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({
        model:route.model,
        instructions:buildZoroInstructions(context),
        input,
        reasoning:{effort:route.reasoningEffort},
        text:{verbosity:route.verbosity},
        max_output_tokens:route.maxOutputTokens,
        store:false
      }),
      signal:controller.signal,
      cache:"no-store"
    });
    if(!response.ok){
      const errorText=(await response.text().catch(()=>"")).slice(0,500);
      throw new Error("OpenAI "+response.status+(errorText?": "+errorText:""));
    }
    const data=await response.json() as {
      model?:string;
      output?:unknown[];
      usage?:{input_tokens?:number;output_tokens?:number;total_tokens?:number};
    };
    const text=extractOutputText(data);
    if(!text)return null;
    return {
      text,
      model:data.model||route.model,
      usage:data.usage?{
        inputTokens:data.usage.input_tokens,
        outputTokens:data.usage.output_tokens,
        totalTokens:data.usage.total_tokens
      }:undefined
    };
  }finally{
    clearTimeout(timer);
  }
}
