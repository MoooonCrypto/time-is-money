import { defaultConfig, type AppConfig } from "../config";
import { dayKey } from "../dates";
import {
  activeRuleCount,
  bulkUnlock,
  cancelPendingChanges,
  classifyChange,
  compactConfig,
  deleteRule,
  draftFromVersion,
  effectiveVersion,
  limitForWeekday,
  referencedSelectionIds,
  resumeLimits,
  ruleStatuses,
  saveRule,
  todaysLimit,
  validateDraft,
  type RuleDraft,
} from "../rules";

// 2026-11-23 is a Monday.
const MON = new Date(2026, 10, 23, 10, 0);
const TUE = new Date(2026, 10, 24, 0, 1);

const xDraft: RuleDraft = {
  name: "X",
  selectionId: "selX",
  mode: "daily",
  dailyLimitMinutes: 20,
  weeklyLimitMinutes: Array(7).fill(null),
};
const ytDraft: RuleDraft = {
  name: "YouTube",
  selectionId: "selYT",
  mode: "daily",
  dailyLimitMinutes: 60,
  weeklyLimitMinutes: Array(7).fill(null),
};

function setup(): { config: AppConfig; x: string; yt: string } {
  let config = defaultConfig();
  const a = saveRule(config, null, xDraft, null, MON);
  config = a.config;
  const b = saveRule(config, null, ytDraft, null, MON);
  return { config: b.config, x: a.ruleId, yt: b.ruleId };
}

describe("rules: independent per-app limits", () => {
  test("X 20min and YouTube 60min are separate rules effective today", () => {
    const { config, x, yt } = setup();
    expect(config.rules).toHaveLength(2);
    expect(todaysLimit(config.rules.find((r) => r.id === x)!, MON)).toBe(20);
    expect(todaysLimit(config.rules.find((r) => r.id === yt)!, MON)).toBe(60);
  });

  test("status: X locked does not imply YouTube locked", () => {
    const { config, x, yt } = setup();
    const st = ruleStatuses(config, MON, [{ ruleId: x, dayKey: dayKey(MON) }]);
    expect(st.find((s) => s.ruleId === x)!.lockedNow).toBe(true);
    expect(st.find((s) => s.ruleId === yt)!.lockedNow).toBe(false);
  });

  test("yesterday's shield record does not count as locked today", () => {
    const { config, x } = setup();
    const st = ruleStatuses(config, TUE, [{ ruleId: x, dayKey: dayKey(MON) }]);
    expect(st.find((s) => s.ruleId === x)!.lockedNow).toBe(false);
  });
});

describe("rules: daily vs weekly", () => {
  test("weekly mode uses the weekday's limit and supports 制限なし", () => {
    let config = defaultConfig();
    const weekly: RuleDraft = {
      ...xDraft,
      mode: "weekly",
      // Sun none, Mon 15, Tue 30, ... Sat none
      weeklyLimitMinutes: [null, 15, 30, 30, 30, 30, null],
    };
    const r = saveRule(config, null, weekly, null, MON);
    config = r.config;
    const rule = config.rules[0];
    expect(todaysLimit(rule, MON)).toBe(15);
    expect(todaysLimit(rule, TUE)).toBe(30);
    expect(todaysLimit(rule, new Date(2026, 10, 29, 12))).toBeNull(); // Sunday
    expect(todaysLimit(rule, new Date(2026, 10, 28, 12))).toBeNull(); // Saturday
  });

  test("daily mode applies the same limit every weekday", () => {
    const v = { mode: "daily" as const, dailyLimitMinutes: 20, weeklyLimitMinutes: [5, 5, 5, 5, 5, 5, 5] };
    for (let w = 0; w < 7; w++) expect(limitForWeekday(v, w)).toBe(20);
  });

  test("validation", () => {
    expect(validateDraft({ ...xDraft, selectionId: null })).toMatch(/アプリ/);
    expect(validateDraft({ ...xDraft, dailyLimitMinutes: null })).toMatch(/上限/);
    expect(validateDraft({ ...xDraft, dailyLimitMinutes: 24 * 60 })).toMatch(/範囲/);
    expect(validateDraft({ ...xDraft, mode: "weekly", weeklyLimitMinutes: Array(7).fill(null) })).toMatch(/曜日/);
    expect(validateDraft(xDraft)).toBeNull();
  });
});

describe("rules: loosening applies tomorrow, tightening today", () => {
  test("raising a limit is deferred to tomorrow; today keeps the old limit", () => {
    const { config, x } = setup();
    const res = saveRule(config, x, { ...xDraft, dailyLimitMinutes: 40 }, "same", MON);
    expect(res.timing).toBe("nextDay");
    expect(res.effectiveFrom).toBe("2026-11-24");
    const rule = res.config.rules.find((r) => r.id === x)!;
    expect(todaysLimit(rule, MON)).toBe(20);
    expect(todaysLimit(rule, TUE)).toBe(40);
  });

  test("lowering a limit applies today", () => {
    const { config, x } = setup();
    const res = saveRule(config, x, { ...xDraft, dailyLimitMinutes: 10 }, "same", MON);
    expect(res.timing).toBe("immediate");
    expect(todaysLimit(res.config.rules.find((r) => r.id === x)!, MON)).toBe(10);
  });

  test("setting a weekday to 制限なし is loosening", () => {
    const { config, x } = setup();
    const draft: RuleDraft = { ...xDraft, mode: "weekly", weeklyLimitMinutes: [20, 20, null, 20, 20, 20, 20] };
    expect(classifyChange(effectiveVersion(config.rules.find((r) => r.id === x)!, "2026-11-23"), draft, "same")).toBe(
      "nextDay",
    );
  });

  test("removing apps from the selection is loosening, adding apps is tightening", () => {
    const { config, x } = setup();
    const cur = effectiveVersion(config.rules.find((r) => r.id === x)!, "2026-11-23");
    expect(classifyChange(cur, { ...xDraft, selectionId: "new" }, "other")).toBe("nextDay");
    expect(classifyChange(cur, { ...xDraft, selectionId: "new" }, "superset")).toBe("immediate");
    expect(classifyChange(cur, { ...xDraft, selectionId: "new" }, null)).toBe("nextDay");
  });

  test("a later tightening edit replaces a pending loosening", () => {
    const { config, x } = setup();
    const loosened = saveRule(config, x, { ...xDraft, dailyLimitMinutes: 40 }, "same", MON).config;
    const tightened = saveRule(loosened, x, { ...xDraft, dailyLimitMinutes: 15 }, "same", MON);
    expect(tightened.timing).toBe("immediate");
    const rule = tightened.config.rules.find((r) => r.id === x)!;
    expect(todaysLimit(rule, MON)).toBe(15);
    expect(todaysLimit(rule, TUE)).toBe(15);
  });

  test("deleting keeps the rule today and removes it tomorrow", () => {
    const { config, x } = setup();
    const deleted = deleteRule(config, x, MON);
    const rule = deleted.rules.find((r) => r.id === x)!;
    expect(todaysLimit(rule, MON)).toBe(20);
    expect(todaysLimit(rule, TUE)).toBeNull();
    const st = ruleStatuses(deleted, MON, []).find((s) => s.ruleId === x)!;
    expect(st.pending?.deleted).toBe(true);
    // compaction on Tuesday drops the rule entirely
    expect(compactConfig(deleted, TUE).rules.map((r) => r.id)).not.toContain(x);
  });

  test("pending changes can be cancelled", () => {
    const { config, x } = setup();
    const deleted = deleteRule(config, x, MON);
    const restored = cancelPendingChanges(deleted, x, MON);
    expect(todaysLimit(restored.rules.find((r) => r.id === x)!, TUE)).toBe(20);
  });

  test("compaction keeps the version effective today and future ones", () => {
    const { config, x } = setup();
    const c1 = saveRule(config, x, { ...xDraft, dailyLimitMinutes: 10 }, "same", MON).config; // today
    const c2 = saveRule(c1, x, { ...xDraft, dailyLimitMinutes: 50 }, "same", MON).config; // tomorrow
    const compact = compactConfig(c2, MON);
    const rule = compact.rules.find((r) => r.id === x)!;
    expect(rule.versions.map((v) => v.effectiveFrom)).toEqual(["2026-11-23", "2026-11-24"]);
    expect(todaysLimit(rule, MON)).toBe(10);
    expect(todaysLimit(rule, TUE)).toBe(50);
  });

  test("referenced selections include pending versions", () => {
    const { config, x } = setup();
    const c = saveRule(config, x, { ...xDraft, selectionId: "selX2" }, "other", MON).config;
    expect(referencedSelectionIds(c).sort()).toEqual(["selX", "selX2", "selYT"]);
  });

  test("draftFromVersion round trip", () => {
    const { config, x } = setup();
    const v = effectiveVersion(config.rules.find((r) => r.id === x)!, "2026-11-23");
    expect(draftFromVersion("X", v)).toMatchObject({ selectionId: "selX", mode: "daily", dailyLimitMinutes: 20 });
  });

  test("rule count includes rules pending deletion (their monitor still runs today)", () => {
    const { config, x } = setup();
    expect(activeRuleCount(deleteRule(config, x, MON), MON)).toBe(2);
  });
});

describe("bulk unlock", () => {
  test("unlock keeps rules and bumps generation; resume bumps again", () => {
    const { config } = setup();
    const u = bulkUnlock(config, MON);
    expect(u.rules).toEqual(config.rules);
    expect(u.bulkUnlock).toMatchObject({ active: true, generation: 1 });
    expect(bulkUnlock(u, MON)).toBe(u); // idempotent
    const r = resumeLimits(u, MON);
    expect(r.bulkUnlock).toMatchObject({ active: false, generation: 2 });
    expect(resumeLimits(r, MON)).toBe(r);
  });

  test("nothing shows as locked while unlocked", () => {
    const { config, x } = setup();
    const u = bulkUnlock(config, MON);
    expect(ruleStatuses(u, MON, [{ ruleId: x, dayKey: "2026-11-23" }])[0].lockedNow).toBe(false);
  });
});
