"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,BellRing,BrainCircuit,CalendarDays,Command,DatabaseZap,FileText,Hourglass,Info,Inbox,ListTodo,
  Mic2,PlusCircle,PlugZap,Search,Settings2,ShieldCheck,Sparkles,SunMedium,X
} from "lucide-react";

type PaletteCommand={
  id:string;title:string;detail:string;group:string;Icon:typeof Search;
  href?:string;capture?:"task"|"reminder";keywords?:string;
};

const commands:PaletteCommand[]=[
  {id:"zoro",href:"/assistant",title:"Open Zoro",detail:"Voice, reasoning and action previews",Icon:Mic2,group:"AI",keywords:"chat assistant ask"},
  {id:"today",href:"/today",title:"Today",detail:"Your prioritized action inbox",Icon:SunMedium,group:"Workspace",keywords:"priority now"},
  {id:"briefing",href:"/briefing",title:"Daily Briefing",detail:"Decision-ready view across tasks, email, waiting and calendar",Icon:FileText,group:"Workspace",keywords:"brief summary morning day"},
  {id:"waiting",href:"/waiting",title:"Waiting Radar",detail:"Track overdue and upcoming follow-ups",Icon:Hourglass,group:"Workspace",keywords:"followup follow-up waiting response"},
  {id:"home",href:"/",title:"Command Center",detail:"Zoro Now, priorities and daily signals",Icon:Sparkles,group:"Workspace",keywords:"home dashboard"},
  {id:"capture-task",capture:"task",title:"Capture task",detail:"Create a mission without leaving this screen",Icon:PlusCircle,group:"Create",keywords:"todo add mission"},
  {id:"capture-reminder",capture:"reminder",title:"Create reminder",detail:"One-time or daily reminder",Icon:BellRing,group:"Create",keywords:"alarm notify remember"},
  {id:"tasks",href:"/tasks",title:"Missions",detail:"Review tasks, priorities and next actions",Icon:ListTodo,group:"Workspace",keywords:"task todo"},
  {id:"calendar",href:"/calendar",title:"Timeline",detail:"Review Google Calendar and commitments",Icon:CalendarDays,group:"Workspace",keywords:"event schedule"},
  {id:"inbox",href:"/inbox?scan=1",title:"Scan Intel",detail:"Process Gmail into actionable intelligence",Icon:Inbox,group:"Intelligence",keywords:"email gmail scan"},
  {id:"data",href:"/intelligence",title:"Data Hub",detail:"Weather, AQI, locations and external signals",Icon:DatabaseZap,group:"Intelligence",keywords:"weather air quality places"},
  {id:"search",href:"/search",title:"Search everything",detail:"Find tasks, emails, follow-ups and calendar events",Icon:Search,group:"Workspace",keywords:"find"},
  {id:"core",href:"/core",title:"Core Control",detail:"Review proposed autonomous actions",Icon:BrainCircuit,group:"AI",keywords:"approval autonomy"},
  {id:"alerts",href:"/notifications",title:"Alerts & reminders",detail:"Notification rules, watches and reminder center",Icon:BellRing,group:"System",keywords:"push alarm"},
  {id:"activity",href:"/activity",title:"Activity stream",detail:"See what your secretary has done",Icon:Activity,group:"System",keywords:"audit history"},
  {id:"connections",href:"/connections",title:"Connections",detail:"Manage Google access and integrations",Icon:PlugZap,group:"System",keywords:"oauth gmail calendar"},
  {id:"health",href:"/settings/system",title:"System Health",detail:"Check database, Google, push and gateway health",Icon:ShieldCheck,group:"System",keywords:"status diagnostics"},
  {id:"assistant-settings",href:"/settings/assistant",title:"Assistant preferences",detail:"Wake word, voice and model settings",Icon:Settings2,group:"System",keywords:"voice model"},
  {id:"about",href:"/about",title:"About Zoro",detail:"Release notes and build information",Icon:Info,group:"System",keywords:"version release"}
];

export function NexusCommand(){
  const dialog=useRef<HTMLDialogElement>(null);
  const input=useRef<HTMLInputElement>(null);
  const router=useRouter();
  const [query,setQuery]=useState("");
  const [active,setActive]=useState(0);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){
        event.preventDefault();open();
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);

  const filtered=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle)return commands;
    return commands.filter(item=>`${item.title} ${item.detail} ${item.group} ${item.keywords||""}`.toLowerCase().includes(needle));
  },[query]);

  useEffect(()=>setActive(0),[query]);

  function open(){
    setQuery("");setActive(0);dialog.current?.showModal();
    window.setTimeout(()=>input.current?.focus(),30);
  }
  function close(){dialog.current?.close()}
  function run(item:PaletteCommand){
    close();
    if(item.capture){
      window.setTimeout(()=>window.dispatchEvent(new CustomEvent("zoro:open-capture",{detail:{mode:item.capture}})),20);
      return;
    }
    if(item.href)router.push(item.href);
  }
  function keyDown(event:React.KeyboardEvent<HTMLInputElement>){
    if(event.key==="ArrowDown"){event.preventDefault();setActive(v=>Math.min(filtered.length-1,v+1))}
    if(event.key==="ArrowUp"){event.preventDefault();setActive(v=>Math.max(0,v-1))}
    if(event.key==="Enter"&&filtered[active]){event.preventDefault();run(filtered[active])}
    if(event.key==="Escape"){event.preventDefault();close()}
  }

  return <>
    <button type="button" className="nexus-command-trigger" onClick={open}>
      <Search size={17}/><span>Search or run a command</span><kbd><Command size={12}/>K</kbd>
    </button>

    <dialog ref={dialog} className="nexus-palette" aria-labelledby="nexus-command-title" onClick={event=>{if(event.currentTarget===event.target)close()}}>
      <div className="nexus-palette-shell">
        <div className="nexus-palette-search">
          <Search size={18}/>
          <label className="sr-only" htmlFor="nexus-command-search">Search commands</label>
          <input ref={input} id="nexus-command-search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={keyDown} placeholder="Navigate, create, search…" autoComplete="off"/>
          <button onClick={close} aria-label="Close command palette"><X size={18}/></button>
        </div>

        <div className="nexus-palette-heading">
          <div><p className="nexus-kicker">ZORO COMMAND LAYER</p><h2 id="nexus-command-title">Move instantly.</h2></div>
          <span>{filtered.length} commands</span>
        </div>

        <div className="nexus-palette-list" role="listbox" aria-label="Commands">
          {filtered.map((item,index)=><button
            type="button" key={item.id} role="option" aria-selected={index===active}
            onMouseEnter={()=>setActive(index)} onClick={()=>run(item)}
            className={"nexus-command-item "+(index===active?"is-active":"")}
          >
            <span className="nexus-command-icon"><item.Icon size={18}/></span>
            <span className="nexus-command-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
            <span className="nexus-command-group">{item.group}</span>
          </button>)}
          {!filtered.length&&<div className="nexus-command-empty">No matching command.</div>}
        </div>
        <div className="nexus-palette-footer"><span>↑↓ Navigate</span><span>↵ Open</span><span>Esc Close</span></div>
      </div>
    </dialog>
  </>;
}