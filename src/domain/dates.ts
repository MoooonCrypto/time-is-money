// Local-calendar helpers. Weeks run Sunday -> Saturday everywhere in the app
// (matches TIMCore.weekInterval in Swift).

export type DayKey = string; // "yyyy-MM-dd" in the device's local time zone

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DayKey, days: number): DayKey {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayIndex(date: Date): number {
  return date.getDay();
}

export function weekdayOfKey(key: DayKey): number {
  return parseDayKey(key).getDay();
}

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** Sunday 00:00 (inclusive) to next Sunday 00:00 (exclusive). */
export function weekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function formatDayKeyJa(key: DayKey): string {
  const d = parseDayKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[d.getDay()]})`;
}
