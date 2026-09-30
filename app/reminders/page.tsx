import Link from "next/link";
import { getServerSession } from "next-auth";
import { AlarmClock } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { ReminderManager } from "@/components/reminder-manager";

export const dynamic="force-dynamic";

export default async function RemindersPage(){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return <div className="nexus-page"><section className="nexus-page-heading"><span className="nexus-page-icon"><AlarmClock size={24}/></span><div className="nexus-page-title"><p className="nexus-kicker">ZORO REMINDER ENGINE</p><h1>Reminders</h1><p>Connect Google first so Zoro can securely associate reminders with your account.</p></div><Link className="nexus-secondary-action" href="/connections">Open Connections</Link></section></div>;
  return <div className="nexus-page"><ReminderManager/></div>;
}
