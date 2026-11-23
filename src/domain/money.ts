// Yen conversion. Must produce the same strings as TIMCore.swift
// (notification body, shield subtitle) — see money.test.ts.

export const MIN_RATE_YEN = 1;
export const MAX_RATE_YEN = 1_000_000;

export function yenFor(rateYenPerHour: number, minutes: number): number {
  return Math.round((rateYenPerHour * minutes) / 60);
}

export function formatYen(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(Math.trunc(value)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export type RateParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/** Accepts half/full-width digits and commas ("1,500", "１５００"). */
export function parseRateInput(text: string): RateParseResult {
  const normalized = text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s円]/g, "");
  if (normalized === "") return { ok: false, error: "金額を入力してください" };
  if (!/^\d+$/.test(normalized)) return { ok: false, error: "半角数字で入力してください" };
  const value = Number(normalized);
  if (value < MIN_RATE_YEN) return { ok: false, error: "1円以上で入力してください" };
  if (value > MAX_RATE_YEN) return { ok: false, error: "1,000,000円以下で入力してください" };
  return { ok: true, value };
}

export interface RatePreviewLine {
  label: string;
  yen: string;
}

/** Preview shown while typing the hourly rate. */
export function ratePreview(rate: number): RatePreviewLine[] {
  return [
    { label: "1分", yen: `${formatYen(yenFor(rate, 1))}円` },
    { label: "SNSを30分", yen: `${formatYen(yenFor(rate, 30))}円` },
    { label: "1日2時間", yen: `${formatYen(yenFor(rate, 120))}円` },
    { label: "1日4時間を1か月", yen: `${formatYen(yenFor(rate, 240) * 30)}円` },
  ];
}

/** "今日は6,000円分／4時間をスマホに浪費しました。" (same as TIMCore.usageNotificationBody) */
export function usageNotificationBody(rate: number | null | undefined, hours: number): string {
  if (rate && rate > 0) {
    return `今日は${formatYen(yenFor(rate, hours * 60))}円分／${hours}時間をスマホに浪費しました。`;
  }
  return `今日は${hours}時間をスマホに使いました。時間の単価を設定すると円換算で表示されます。`;
}

/** Same as TIMCore.shieldSubtitle */
export function shieldSubtitle(limitMinutes: number | null | undefined): string {
  if (limitMinutes) {
    return `今日の利用枠${formatDuration(limitMinutes)}を使い切りました。明日また使えます。`;
  }
  return "今日の利用枠を使い切りました。明日また使えます。";
}

/** Cumulative whole-iPhone thresholds (hours). Same list as TIMConstants.usageThresholdHours. */
export const USAGE_THRESHOLD_HOURS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] as const;
