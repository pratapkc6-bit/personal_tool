import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, runtimeAuthConfigured } from "@/lib/auth";
import { CommandCenter } from "@/components/command-center";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = runtimeAuthConfigured ? await getServerSession(authOptions) : null;
  if (!session?.user?.id) return <section className="command-center cc-welcome"><p className="cc-eyebrow">ZORO / YOUR PERSONAL OPERATING SYSTEM</p><h1>A little less noise.<br /><span>A lot more possibility.</span></h1><p className="cc-intro">Your calendar, priorities and next steps. One place to think clearly and move forward.</p><Link href="/connections" className="cc-button cc-primary">{runtimeAuthConfigured ? "Connect your world →" : "Complete setup →"}</Link><div className="cc-welcome-features"><span>Calendar intelligence</span><span>Focus planning</span><span>Optional on-device AI</span></div><p className="cc-caption">No paid AI key required. Google connections enable your personal briefing.</p></section>;
  return <CommandCenter name={session.user.name?.split(" ")[0] || "Pratap"} />;
}
