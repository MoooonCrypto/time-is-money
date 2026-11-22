// Rule versioning and the "loosening takes effect tomorrow" policy.
//
// Each rule keeps versions with an `effectiveFrom` day. Native code (monitor
// extension, at midnight, without the app) simply picks the latest version
// whose effectiveFrom <= today, so pending changes apply even if the app is
// never opened again.
//
//  - New rule ................................ today
//  - Change that only tightens ............... today (limits <= current every weekday,
//                                               app selection unchanged or a superset)
//  - Anything that loosens (higher limit, 制限なし, removed apps, deletion) ... tomorrow
//  - Bulk unlock / resume ...................... immediate, rules are kept

import type { AppConfig, BulkUnlock, LimitMode, Rule, RuleVersion, WeeklyLimits } from "./config";
import { MAX_RULES } from "./config";
import { addDays, dayKey, type DayKey, weekdayIndex } from "./dates";

export type SelectionRelation = "same" | "superset" | "other";
export type ChangeTiming = "immediate" | "nextDay";

export interface RuleDraft {
  name: string;
  selectionId: string | null;
  mode: LimitMode;
  dailyLimitMinutes: number | null;
  weeklyLimitMinutes: WeeklyLimits;
}

export const LIMIT_PRESETS_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180] as const;
export const MIN_LIMIT_MINUTES = 1;
export const MAX_LIMIT_MINUTES = 23 * 60 + 59;

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function effectiveVersion(rule: Rule, day: DayKey): RuleVersion | null {
  let found: RuleVersion | null = null;
  for (const v of rule.versions) if (v.effectiveFrom <= day) found = v;
  return found && !found.deleted ? found : null;
}

/** Limit in minutes for a weekday (0 = Sunday), null = no limit. */
export function limitForWeekday(v: Pick<RuleVersion, "mode" | "dailyLimitMinutes" | "weeklyLimitMinutes">, weekday: number): number | null {
  const raw = v.mode === "weekly" ? (v.weeklyLimitMinutes[weekday] ?? null) : v.dailyLimitMinutes;
  return raw !== null && raw > 0 ? raw : null;
}

export function todaysLimit(rule: Rule, now: Date): number | null {
  const v = effectiveVersion(rule, dayKey(now));
  return v ? limitForWeekday(v, weekdayIndex(now)) : null;
}

/** Versions effective after today (i.e. pending). */
export function pendingVersions(rule: Rule, now: Date): RuleVersion[] {
  const today = dayKey(now);
  return rule.versions.filter((v) => v.effectiveFrom > today);
}

export function validateDraft(draft: RuleDraft): string | null {
  if (!draft.selectionId) return "制限するアプリを選んでください";
  const check = (m: number | null) =>
    m === null || (Number.isInteger(m) && m >= MIN_LIMIT_MINUTES && m <= MAX_LIMIT_MINUTES);
  if (draft.mode === "daily") {
    if (draft.dailyLimitMinutes === null) return "上限時間を設定してください";
    if (!check(draft.dailyLimitMinutes)) return "上限は1分〜23時間59分の範囲で設定してください";
  } else {
    if (draft.weeklyLimitMinutes.length !== 7) return "曜日別の設定が不正です";
    if (!draft.weeklyLimitMinutes.every(check)) return "上限は1分〜23時間59分の範囲で設定してください";
    if (draft.weeklyLimitMinutes.every((m) => m === null)) return "少なくとも1つの曜日に上限を設定してください";
  }
  return null;
}

/** Is the draft at least as strict as `current` on every weekday? */
export function isTighteningOnly(current: RuleVersion, draft: RuleDraft, relation: SelectionRelation | null): boolean {
  const selectionOk =
    draft.selectionId === current.selectionId || relation === "same" || relation === "superset";
  if (!selectionOk) return false;
  for (let w = 0; w < 7; w++) {
    const before = limitForWeekday(current, w);
    const after = limitForWeekday(draft, w);
    if (after === null && before !== null) return false; // became 制限なし
    if (after !== null && before !== null && after > before) return false; // raised
  }
  return true;
}

export function classifyChange(current: RuleVersion | null, draft: RuleDraft, relation: SelectionRelation | null): ChangeTiming {
  if (!current) return "immediate";
  return isTighteningOnly(current, draft, relation) ? "immediate" : "nextDay";
}

function draftToVersion(draft: RuleDraft, effectiveFrom: DayKey): RuleVersion {
  return {
    versionId: newId("v"),
    effectiveFrom,
    deleted: false,
    selectionId: draft.selectionId,
    mode: draft.mode,
    dailyLimitMinutes: draft.mode === "daily" ? draft.dailyLimitMinutes : null,
    weeklyLimitMinutes:
      draft.mode === "weekly" ? draft.weeklyLimitMinutes.slice(0, 7) : Array(7).fill(null),
  };
}

export function draftFromVersion(name: string, v: RuleVersion | null): RuleDraft {
  if (!v) {
    return { name, selectionId: null, mode: "daily", dailyLimitMinutes: 30, weeklyLimitMinutes: Array(7).fill(30) };
  }
  return {
    name,
    selectionId: v.selectionId,
    mode: v.mode,
    dailyLimitMinutes: v.dailyLimitMinutes ?? (v.mode === "weekly" ? 30 : null),
    weeklyLimitMinutes:
      v.mode === "weekly" ? v.weeklyLimitMinutes.slice(0, 7) : Array(7).fill(v.dailyLimitMinutes ?? 30),
  };
}

export interface SaveResult {
  config: AppConfig;
  ruleId: string;
  timing: ChangeTiming;
  effectiveFrom: DayKey;
}

/**
 * Applies a draft. The comparison is always against the version effective
 * *today*; a newer edit replaces any pending (tomorrow) version.
 */
export function saveRule(
  config: AppConfig,
  ruleId: string | null,
  draft: RuleDraft,
  relation: SelectionRelation | null,
  now: Date,
): SaveResult {
  const error = validateDraft(draft);
  if (error) throw new Error(error);
  const today = dayKey(now);
  const tomorrow = addDays(today, 1);
  const existing = ruleId ? config.rules.find((r) => r.id === ruleId) : undefined;

  if (!existing) {
    if (activeRuleCount(config, now) >= MAX_RULES) throw new Error(`制限は${MAX_RULES}件まで設定できます（削除した制限の枠は翌日に空きます）`);
    const id = newId("r");
    const rule: Rule = { id, name: draft.name.trim() || defaultRuleName(config), versions: [draftToVersion(draft, today)] };
    return { config: { ...config, rules: [...config.rules, rule] }, ruleId: id, timing: "immediate", effectiveFrom: today };
  }

  const current = effectiveVersion(existing, today);
  const timing = classifyChange(current, draft, relation);
  const effectiveFrom = timing === "immediate" ? today : tomorrow;
  // Keep history up to today, drop pending versions (superseded by this edit).
  const kept = existing.versions.filter((v) => v.effectiveFrom <= today);
  const updated: Rule = {
    ...existing,
    name: draft.name.trim() || existing.name,
    versions: [...kept, draftToVersion(draft, effectiveFrom)],
  };
  return {
    config: { ...config, rules: config.rules.map((r) => (r.id === existing.id ? updated : r)) },
    ruleId: existing.id,
    timing,
    effectiveFrom,
  };
}

/** Deleting loosens, so it takes effect tomorrow. The rule stays active today. */
export function deleteRule(config: AppConfig, ruleId: string, now: Date): AppConfig {
  const today = dayKey(now);
  const tomorrow = addDays(today, 1);
  return {
    ...config,
    rules: config.rules.map((r) => {
      if (r.id !== ruleId) return r;
      const current = effectiveVersion(r, today);
      const kept = r.versions.filter((v) => v.effectiveFrom <= today);
      const tomb: RuleVersion = {
        versionId: newId("v"),
        effectiveFrom: tomorrow,
        deleted: true,
        selectionId: current?.selectionId ?? null,
        mode: current?.mode ?? "daily",
        dailyLimitMinutes: null,
        weeklyLimitMinutes: Array(7).fill(null),
      };
      return { ...r, versions: [...kept, tomb] };
    }),
  };
}

/** Cancels pending (tomorrow) changes, including a pending deletion. */
export function cancelPendingChanges(config: AppConfig, ruleId: string, now: Date): AppConfig {
  const today = dayKey(now);
  return {
    ...config,
    rules: config.rules.map((r) =>
      r.id === ruleId ? { ...r, versions: r.versions.filter((v) => v.effectiveFrom <= today) } : r,
    ),
  };
}

/** Drops history that can no longer apply and rules that are fully deleted. */
export function compactConfig(config: AppConfig, now: Date): AppConfig {
  const today = dayKey(now);
  const rules = config.rules.flatMap((r): Rule[] => {
    const past = r.versions.filter((v) => v.effectiveFrom <= today);
    const future = r.versions.filter((v) => v.effectiveFrom > today);
    const current = past.length > 0 ? past[past.length - 1] : null;
    if (current?.deleted && future.length === 0) return [];
    if (!current && future.length === 0) return [];
    return [{ ...r, versions: [...(current ? [current] : []), ...future] }];
  });
  return { ...config, rules };
}

export function referencedSelectionIds(config: AppConfig): string[] {
  const ids = new Set<string>();
  for (const r of config.rules) for (const v of r.versions) if (v.selectionId) ids.add(v.selectionId);
  return [...ids];
}

/**
 * Rules that still need a DeviceActivity monitor today. A rule pending deletion
 * keeps limiting until tomorrow, so it still counts (its slot frees up tomorrow).
 */
export function activeRuleCount(config: AppConfig, _now: Date): number {
  return config.rules.length;
}

function defaultRuleName(config: AppConfig): string {
  return `制限${config.rules.length + 1}`;
}

// MARK: Bulk unlock

export function bulkUnlock(config: AppConfig, now: Date): AppConfig {
  if (config.bulkUnlock.active) return config;
  const bu: BulkUnlock = { active: true, generation: config.bulkUnlock.generation + 1, changedAt: now.toISOString() };
  return { ...config, bulkUnlock: bu };
}

export function resumeLimits(config: AppConfig, now: Date): AppConfig {
  if (!config.bulkUnlock.active) return config;
  const bu: BulkUnlock = { active: false, generation: config.bulkUnlock.generation + 1, changedAt: now.toISOString() };
  return { ...config, bulkUnlock: bu };
}

// MARK: Status for "現在の制限"

export interface RuleStatus {
  ruleId: string;
  name: string;
  selectionId: string | null;
  limitToday: number | null;
  /** Shield applied today according to native state. */
  lockedNow: boolean;
  pending: { effectiveFrom: DayKey; deleted: boolean; version: RuleVersion } | null;
  /** The rule starts tomorrow only (not effective today). */
  notYetEffective: boolean;
}

export function ruleStatuses(
  config: AppConfig,
  now: Date,
  shieldedToday: { ruleId: string; dayKey: string }[],
): RuleStatus[] {
  const today = dayKey(now);
  return config.rules.map((r) => {
    const current = effectiveVersion(r, today);
    const pend = pendingVersions(r, now);
    const last = pend.length > 0 ? pend[pend.length - 1] : null;
    return {
      ruleId: r.id,
      name: r.name,
      selectionId: current?.selectionId ?? last?.selectionId ?? null,
      limitToday: current ? limitForWeekday(current, weekdayIndex(now)) : null,
      lockedNow:
        !config.bulkUnlock.active && shieldedToday.some((s) => s.ruleId === r.id && s.dayKey === today),
      pending: last ? { effectiveFrom: last.effectiveFrom, deleted: last.deleted, version: last } : null,
      notYetEffective: !current,
    };
  });
}

export function describeLimits(v: Pick<RuleVersion, "mode" | "dailyLimitMinutes" | "weeklyLimitMinutes">, fmt: (m: number) => string): string {
  if (v.mode === "daily") return v.dailyLimitMinutes ? `毎日 ${fmt(v.dailyLimitMinutes)}` : "制限なし";
  const labels = ["日", "月", "火", "水", "木", "金", "土"];
  return labels
    .map((l, i) => {
      const m = limitForWeekday(v, i);
      return `${l} ${m ? fmt(m) : "なし"}`;
    })
    .join(" / ");
}
