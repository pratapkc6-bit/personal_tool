import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { APP_VERSION } from "@/lib/release";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl pb-24 sm:pb-8">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex min-h-11 items-center font-semibold tracking-tight">
            Pratap Personal Secretary
          </Link>
          <nav className="hidden items-center gap-2 text-sm sm:flex">
            <Link className="rounded-xl px-3 py-2 hover:bg-slate-100" href="/search">Search</Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-slate-100" href="/activity">Activity</Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-slate-100" href="/connections">Connections</Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-slate-100" href="/about">About</Link>
          </nav>
        </div>
      </header>
      <main className="px-4 py-5">{children}</main>
      <footer className="px-4 pb-4 text-center text-xs text-slate-500">
        <Link href="/about" className="hover:text-slate-900">
          Pratap Personal Secretary v{APP_VERSION}
        </Link>
      </footer>
      <BottomNav />
    </div>
  );
}
