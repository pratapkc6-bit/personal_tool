import { GlobalSearch } from "@/components/global-search";

export default function SearchPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">GLOBAL SEARCH</p>
        <h1 className="text-2xl font-bold tracking-tight">Find anything</h1>
        <p className="mt-1 text-sm text-slate-600">Search Gmail intelligence, tasks, follow-ups and Google Calendar together.</p>
      </div>
      <GlobalSearch />
    </div>
  );
}
