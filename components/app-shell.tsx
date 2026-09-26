import Link from "next/link";
import { Cpu, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { APP_VERSION } from "@/lib/release";
import { QuickCapture } from "@/components/quick-capture";
import { WorkspaceNav } from "@/components/workspace-nav";
import { ZoroLauncher } from "@/components/zoro-launcher";
import { NexusCommand } from "@/components/nexus-command";
import { SystemClock } from "@/components/system-clock";
import { ZoroPresence } from "@/components/zoro-presence";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="zoro-app nexus-shell">
      <a href="#workspace-content" className="hub-skip">Skip to content</a>

      <aside className="nexus-rail">
        <div className="nexus-rail-brand">
          <Link href="/" className="nexus-brand" aria-label="Zoro Nexus home">
            <span className="nexus-brand-orb"><Cpu size={22} /></span>
            <span className="nexus-brand-copy">
              <strong>ZORO</strong>
              <small>NEXUS</small>
            </span>
          </Link>
          <span className="nexus-version-pill">v{APP_VERSION}</span>
        </div>

        <div className="nexus-rail-caption">PERSONAL OPERATING SYSTEM</div>
        <WorkspaceNav />

        <div className="nexus-rail-bottom">
          <div className="nexus-security-card">
            <ShieldCheck size={17} />
            <div>
              <strong>Private runtime</strong>
              <small>Confirmations protect write actions</small>
            </div>
          </div>
          <Link href="/about" className="nexus-about-link">System architecture ↗</Link>
        </div>
      </aside>

      <section className="nexus-stage">
        <header className="nexus-topbar">
          <Link href="/" className="nexus-mobile-brand">
            <span>Z</span>
            <strong>Zoro Nexus</strong>
          </Link>
          <NexusCommand />
          <div className="nexus-topbar-actions">
            <SystemClock />
            <QuickCapture />
          </div>
        </header>

        <main id="workspace-content" className="nexus-content">{children}</main>

        <footer className="nexus-footer">
          <span>Zoro Nexus · v{APP_VERSION}</span>
          <span>Observe · Prioritise · Act · Verify</span>
        </footer>
      </section>

      <ZoroPresence />
      <ZoroLauncher />
      <BottomNav />
    </div>
  );
}
