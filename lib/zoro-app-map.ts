export const ZORO_APP_LAYOUT={
  product:"Zoro Nexus",
  purpose:"Private personal operating system and AI secretary",
  assistantSurface:{
    route:"/assistant",
    mobile:"Full-screen assistant experience with a top bar, conversation stream, confirmation cards, voice mode and a bottom composer.",
    controls:["Back","Context","New conversation","Settings","Voice","Send"],
    writeSafety:"Calendar, Gmail sends/drafts, tasks, reminders, alarms and roster writes require confirmation before execution."
  },
  navigation:{
    desktop:"Persistent left workspace rail plus top command bar.",
    mobile:"Bottom dock: Home, Timeline, central Zoro AI, Intel, More.",
    rule:"When helping the user find something in Zoro, name the exact route and visible label instead of giving generic navigation advice."
  },
  routes:[
    {route:"/",label:"Command",purpose:"Daily command center and priorities"},
    {route:"/today",label:"Today",purpose:"What matters now"},
    {route:"/briefing",label:"Briefing",purpose:"Decision-ready daily briefing"},
    {route:"/waiting",label:"Waiting",purpose:"Follow-up radar"},
    {route:"/assistant",label:"Zoro AI",purpose:"Reason, chat and prepare actions"},
    {route:"/core",label:"Core Control",purpose:"Approvals and autonomy controls"},
    {route:"/tasks",label:"Missions",purpose:"Tasks, outcomes and next actions"},
    {route:"/calendar",label:"Timeline",purpose:"Calendar and commitments"},
    {route:"/inbox",label:"Intel",purpose:"Gmail intelligence and email actions"},
    {route:"/search",label:"Search",purpose:"Search across Zoro data"},
    {route:"/intelligence",label:"Data Hub",purpose:"Weather, rates and local data"},
    {route:"/activity",label:"Activity",purpose:"System/action history"},
    {route:"/reminders",label:"Reminders",purpose:"Create, snooze, complete and delete reminders"},
    {route:"/notifications",label:"Alerts",purpose:"Push settings, reminders and watches"},
    {route:"/connections",label:"Connections",purpose:"Google account and data connections"},
    {route:"/settings",label:"Settings",purpose:"Preferences and app settings"}
  ]
} as const;
