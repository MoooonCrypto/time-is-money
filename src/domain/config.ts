// Persistent settings (device only). Serialized as JSON into the App Group
// (key "tim.config.v1") so the DeviceActivityMonitor / Shield / Report
// extensions can read it. Swift decoder: targets/_shared/TIMCore.swift (TIMConfig).

import type { DayKey } from "./dates";

export type LimitMode = "daily" | "weekly";

/** Minutes per weekday, index 0 = Sunday. null = 制限なし. */
export type WeeklyLimits = (number | null)[];

export interface RuleVersion {
  versionId: string;
  effectiveFrom: DayKey;
  deleted: boolean;
  /** Opaque FamilyActivitySelection id stored natively. */
  selectionId: string | null;
  mode: LimitMode;
  dailyLimitMinutes: number | null;
  weeklyLimitMinutes: WeeklyLimits;
}

export interface Rule {
  id: string;
  name: string;
  /** Ordered by creation; the latest one with effectiveFrom <= day applies. */
  versions: RuleVersion[];
}

export interface BulkUnlock {
  active: boolean;
  /** Incremented on every unlock/resume; stale monitor events carry an old generation. */
  generation: number;
  changedAt: string | null;
}

export interface AppConfig {
  schemaVersion: 1;
  hourlyRateYen: number | null;
  onboardingCompleted: boolean;
  rules: Rule[];
  bulkUnlock: BulkUnlock;
  /** Development builds only: thresholds in minutes instead of hours. Native ignores it in Release. */
  debugShortThresholds?: boolean;
}

export const MAX_RULES = 15;

export function defaultConfig(): AppConfig {
  return {
    schemaVersion: 1,
    hourlyRateYen: null,
    onboardingCompleted: false,
    rules: [],
    bulkUnlock: { active: false, generation: 0, changedAt: null },
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseWeekly(v: unknown): WeeklyLimits {
  const arr = Array.isArray(v) ? v : [];
  return Array.from({ length: 7 }, (_, i) => {
    const n = num(arr[i]);
    return n !== null && n > 0 ? Math.round(n) : null;
  });
}

function parseVersion(v: unknown): RuleVersion | null {
  if (!isObj(v) || typeof v.versionId !== "string" || typeof v.effectiveFrom !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.effectiveFrom)) return null;
  const daily = num(v.dailyLimitMinutes);
  return {
    versionId: v.versionId,
    effectiveFrom: v.effectiveFrom,
    deleted: v.deleted === true,
    selectionId: typeof v.selectionId === "string" ? v.selectionId : null,
    mode: v.mode === "weekly" ? "weekly" : "daily",
    dailyLimitMinutes: daily !== null && daily > 0 ? Math.round(daily) : null,
    weeklyLimitMinutes: parseWeekly(v.weeklyLimitMinutes),
  };
}

/** Tolerant parser: unknown/invalid input falls back to defaults instead of crashing. */
export function parseConfig(json: string | null | undefined): AppConfig {
  const base = defaultConfig();
  if (!json) return base;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return base;
  }
  if (!isObj(raw)) return base;
  const rate = num(raw.hourlyRateYen);
  const rules: Rule[] = Array.isArray(raw.rules)
    ? raw.rules.flatMap((r): Rule[] => {
        if (!isObj(r) || typeof r.id !== "string") return [];
        const versions = Array.isArray(r.versions)
          ? r.versions.map(parseVersion).filter((x): x is RuleVersion => x !== null)
          : [];
        if (versions.length === 0) return [];
        return [{ id: r.id, name: typeof r.name === "string" ? r.name : "", versions }];
      })
    : [];
  const bu = isObj(raw.bulkUnlock) ? raw.bulkUnlock : {};
  return {
    schemaVersion: 1,
    hourlyRateYen: rate !== null && rate > 0 ? Math.round(rate) : null,
    onboardingCompleted: raw.onboardingCompleted === true,
    rules,
    bulkUnlock: {
      active: bu.active === true,
      generation: num(bu.generation) ?? 0,
      changedAt: typeof bu.changedAt === "string" ? bu.changedAt : null,
    },
    ...(raw.debugShortThresholds === true ? { debugShortThresholds: true } : {}),
  };
}

export function serializeConfig(config: AppConfig, opts: { allowDebug: boolean }): string {
  const out: AppConfig = { ...config };
  if (!opts.allowDebug) delete out.debugShortThresholds;
  return JSON.stringify(out);
}
