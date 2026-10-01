import { GlobalSearch } from "@/components/global-search";

export default function SearchPage(){
  return <div className="professional-page">
    <header className="professional-page-header">
      <div>
        <p className="professional-kicker">UNIVERSAL SEARCH</p>
        <h1>Find anything</h1>
        <p>Search email intelligence, tasks, follow-ups, reminders, approvals, Zoro memory and Google Calendar together.</p>
      </div>
    </header>
    <GlobalSearch/>
  </div>;
}