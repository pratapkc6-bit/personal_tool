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

export function openAIConfigured(){
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function chooseOpenAIModel(message:string){
  const complex=/\b(analy[sz]e|compare|strategy|plan my|deep|reason|trade-?off|pros and cons|recommend|prioriti[sz]e everything|what should i do and why)\b/i.test(message);
  return complex?SMART_MODEL:DEFAULT_MODEL;
}

export function compactAssistantContext(context:AssistantContext){
  return {
    generatedAt:context.generatedAt,
    timezone:context.timezone,
    calendarStatus:context.calendarStatus,
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
    calendarEvents:context.calendarEvents.slice(0,16)
  };
}

export function buildZoroInstructions(context:AssistantContext){
  const snapshot=JSON.stringify(compactAssistantContext(context));
  return [
    "You are Zoro, a private personal AI secretary.",
    "Be concise, practical, specific, and calm. Prefer a clear next action over generic advice.",
    "Use the supplied Zoro context as the source of truth for the user's personal tasks, email intelligence, follow-ups, deadlines, and calendar.",
    "Never invent an email, event, deadline, task, status, person, or completed action that is not in the supplied context.",
    "If the context says Calendar is unavailable or partial, state that limitation instead of claiming the user is free.",
    "Never claim you sent email, changed Calendar, created a task, or completed another external action. Zoro's deterministic action layer handles writes and confirmation separately.",
    "When useful, explain why something matters, but keep the response easy to scan.",
    "The user's operating timezone is "+context.timezone+".",
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

  const model=chooseOpenAIModel(message);
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
        model,
        instructions:buildZoroInstructions(context),
        input,
        reasoning:{effort:"medium"},
        text:{verbosity:"medium"},
        max_output_tokens:1000,
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
      model:data.model||model,
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
