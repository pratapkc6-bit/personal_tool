import { CalendarBoard } from "@/components/calendar-board";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">GOOGLE CALENDAR</p>
        <h1 className="text-2xl font-bold tracking-tight">Live calendar</h1>
        <p className="mt-1 text-sm text-slate-600">Day, week, month and agenda views. Changes are confirmed before writing to Google Calendar.</p>
      </div>
      <CalendarBoard />
    </div>
  );
}
