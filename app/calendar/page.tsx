import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { CalendarBoard } from "@/components/calendar-board";
import { EventCreator } from "@/components/event-creator";

export default function CalendarPage() {
  return (
    <div className="nexus-page">
      <div className="nexus-page-heading">
        <div className="nexus-page-icon"><CalendarDays size={22} /></div>
        <div className="nexus-page-title">
          <p className="nexus-kicker">TEMPORAL MAP</p>
          <h1>Your timeline</h1>
          <p>See commitments, protect focus windows and preview every calendar write before it happens.</p>
        </div>
        <Suspense fallback={<div className="nexus-action-skeleton" aria-hidden />}>
          <EventCreator />
        </Suspense>
      </div>
      <CalendarBoard />
    </div>
  );
}
