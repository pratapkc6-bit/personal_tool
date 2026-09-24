import { CalendarBoard } from "@/components/calendar-board";
import { EventCreator } from "@/components/event-creator";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">GOOGLE CALENDAR</p>
          <h1 className="text-2xl font-bold tracking-tight">Live calendar</h1>
          <p className="mt-1 text-sm text-slate-600">Day, week, month and agenda views. Create, edit, reschedule and delete changes are previewed before writing.</p>
        </div>
        <EventCreator />
      </div>
      <CalendarBoard />
    </div>
  );
}
