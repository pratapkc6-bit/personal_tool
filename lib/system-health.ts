import { db } from "@/lib/db";
import { runtimeAuthConfigured } from "@/lib/auth";
import { APP_VERSION } from "@/lib/release";

export type HealthState = "healthy" | "attention" | "unavailable";
export type HealthCheck = { key:string; label:string; state:HealthState; detail:string };

export async function getSystemHealth(userId?:string) {
  const checks:HealthCheck[]=[];
  let database=false;
  try { await db.$queryRaw`SELECT 1`; database=true; } catch {}
  checks.push({key:"database",label:"Database",state:database?"healthy":"unavailable",detail:database?"Neon/Postgres is responding.":"Database check failed."});
  checks.push({key:"auth",label:"Authentication",state:runtimeAuthConfigured?"healthy":"unavailable",detail:runtimeAuthConfigured?"NextAuth runtime configuration is present.":"Required authentication configuration is incomplete."});

  let google=false;
  if(database&&userId){
    try { google=Boolean(await db.account.findFirst({where:{userId,provider:"google"},select:{id:true}})); } catch {}
  }
  checks.push({key:"google",label:"Google connection",state:google?"healthy":"attention",detail:google?"Google account is linked.":"No linked Google account detected for this session."});

  const vapid=Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||process.env.VAPID_PUBLIC_KEY) && Boolean(process.env.VAPID_PRIVATE_KEY);
  checks.push({key:"push",label:"Background push",state:vapid?"healthy":"attention",detail:vapid?"VAPID push infrastructure is configured.":"VAPID keys are incomplete; foreground alerts can still work."});

  const cronSecret=Boolean(process.env.CRON_SECRET);
  checks.push({key:"scheduler",label:"Secretary scheduler",state:cronSecret?"healthy":"attention",detail:cronSecret?"Cron authentication is configured.":"CRON_SECRET is not detected."});

  const deployment=Boolean(process.env.VERCEL_URL||process.env.VERCEL_DEPLOYMENT_ID);
  checks.push({key:"deployment",label:"Deployment identity",state:deployment?"healthy":"attention",detail:deployment?"Vercel deployment metadata is available.":"Deployment metadata is unavailable in this runtime."});

  const healthy=checks.filter(x=>x.state==="healthy").length;
  return {version:APP_VERSION,checks,healthy,total:checks.length,overall:checks.some(x=>x.state==="unavailable")?"attention":healthy===checks.length?"healthy":"attention",checkedAt:new Date().toISOString()};
}
