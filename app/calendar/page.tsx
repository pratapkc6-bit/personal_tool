import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { CalendarBoard } from "@/components/calendar-board";
import { EventCreator } from "@/components/event-creator";

export default function CalendarPage() {
  return (
    <div className="nexus-page immersive-page immersive-page-timeline">
      <div id="live-calendar" className="timeline-page-surface">
        <div className="timeline-page-heading">
          <div className="timeline-page-title">
            <span className="timeline-page-icon"><CalendarDays size={21} /></span>
            <div>
              <p className="nexus-kicker">ZORO TIMELINE</p>
              <h1>Timeline</h1>
              <p>See what is happening now, what is next, and where your free time actually is.</p>
            </div>
          </div>
          <Suspense fallback={<div className="nexus-action-skeleton" aria-hidden />}>
            <EventCreator />
          </Suspense>
        </div>
        <CalendarBoard />
      </div>
    </div>
  );
}
