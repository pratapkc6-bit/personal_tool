import Link from "next/link";
import { getServerSession } from "next-auth";
import { BellRing } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { NotificationCenter } from "@/components/notification-center";

export const dynamic="force-dynamic";

export default async function NotificationsPage(){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return <div className="nexus-page"><section className="nexus-page-heading"><span className="nexus-page-icon"><BellRing size={24}/></span><div className="nexus-page-title"><p className="nexus-kicker">ZORO ALERT ENGINE</p><h1>Alerts</h1><p>Connect Google first so Zoro can save your notification preferences and reminders.</p></div><Link className="nexus-secondary-action" href="/connections">Open Connections</Link></section></div>;
  return <div className="nexus-page"><NotificationCenter/></div>
}
