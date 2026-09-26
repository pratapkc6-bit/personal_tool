export type ParsedShift = {
  date: string;
  location: string;
  start: string;
  finish: string;
  startAt: Date;
  endAt: Date;
  sourceKey: string;
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateFromLine(line: string) {
  const slash = line.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);
  if (slash) {
    const year = slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3]);
    return { date: `${year}-${pad(Number(slash[2]))}-${pad(Number(slash[1]))}`, match: slash[0] };
  }

  const named = line.match(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    return { date: `${named[3]}-${pad(month)}-${pad(Number(named[1]))}`, match: named[0] };
  }

  return null;
}

export function parseMyobRoster(raw: string): ParsedShift[] {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const shifts: ParsedShift[] = [];

  for (const line of lines) {
    const dateInfo = parseDateFromLine(line);
    if (!dateInfo) continue;

    const times = [...line.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map((m) => m[0]);
    if (times.length < 2) continue;

    const start = times[0].padStart(5, "0");
    const finish = times[1].padStart(5, "0");

    const afterDate = line.slice((line.indexOf(dateInfo.match) + dateInfo.match.length));
    const location = afterDate
      .replace(times[0], "")
      .replace(times[1], "")
      .replace(/^(mon|tue|wed|thu|fri|sat|sun)(day)?\b/i, "")
      .replace(/[|•]+/g, " ")
      .trim() || "Darwin Linen";

    const startAt = new Date(`${dateInfo.date}T${start}:00+09:30`);
    let endAt = new Date(`${dateInfo.date}T${finish}:00+09:30`);
    if (endAt <= startAt) endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);

    const sourceKey = `${dateInfo.date}|${location.toLowerCase()}`;

    shifts.push({
      date: dateInfo.date,
      location,
      start,
      finish,
      startAt,
      endAt,
      sourceKey,
    });
  }

  const unique = new Map(shifts.map((shift) => [shift.sourceKey, shift]));
  return [...unique.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
