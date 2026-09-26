import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { APP_VERSION } from "@/lib/release";
import { QuickCapture } from "@/components/quick-capture";
import { WorkspaceNav } from "@/components/workspace-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="zoro-app">
    <a href="#workspace-content" className="hub-skip">Skip to content</a>
    <header className="hub-header"><div className="hub-header-inner">
      <Link href="/" className="hub-brand" aria-label="Zoro Hub home">zoro<span>hub</span></Link>
      <Link href="/search" className="hub-search-link">Search your tasks, email and calendar <span>↗</span></Link>
      <div className="hub-header-actions"><QuickCapture /><Link href="/about" className="hub-version">v{APP_VERSION}</Link></div>
    </div><WorkspaceNav /></header>
    <main id="workspace-content" className="hub-main">{children}</main>
    <footer className="hub-footer"><Link href="/about">Zoro Hub · {APP_VERSION}</Link><span>Your priorities. Your decisions.</span></footer>
    <BottomNav />
  </div>;
}
