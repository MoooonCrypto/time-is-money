// Plain-Swift tests for targets/_shared/TIMCore.swift (no XCTest needed).
// Run on a Mac: npm run test:swift-core
import Foundation

var failures = 0
func check(_ cond: @autoclosure () -> Bool, _ msg: String, line: Int = #line) {
  if !cond() { failures += 1; print("FAIL (line \(line)): \(msg)") }
}

let tokyo = TimeZone(identifier: "Asia/Tokyo")!
let cal = TIMCore.calendar(timeZone: tokyo)
func date(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 0, _ mi: Int = 0) -> Date {
  cal.date(from: DateComponents(timeZone: tokyo, year: y, month: m, day: d, hour: h, minute: mi))!
}

// Money / text parity with src/domain/money.ts
check(TIMCore.yen(rate: 1500, minutes: 240) == 6000, "yen 4h")
check(TIMCore.formatYen(1234567) == "1,234,567", "formatYen")
check(TIMCore.usageNotificationBody(rate: 1500, hours: 4) == "今日は6,000円分／4時間をスマホに浪費しました。", "notification body")
check(TIMCore.usageNotificationBody(rate: 1500, hours: 6) == "今日は9,000円分／6時間をスマホに浪費しました。", "cumulative")
check(TIMCore.shieldSubtitle(limitMinutes: 20) == "今日の利用枠20分を使い切りました。明日また使えます。", "shield subtitle")
check(TIMCore.shieldSubtitle(limitMinutes: nil) == "今日の利用枠を使い切りました。明日また使えます。", "shield subtitle nil")
check(TIMCore.formatDuration(minutes: 90) == "1時間30分", "duration")

// Dates / week (Sunday start). 2026-11-22 is a Sunday.
check(TIMCore.dayKey(date(2026, 11, 25, 23, 59), calendar: cal) == "2026-11-25", "dayKey")
check(TIMCore.weekdayIndex(date(2026, 11, 22, 12), calendar: cal) == 0, "sunday = 0")
let w = TIMCore.weekInterval(containing: date(2026, 11, 28, 23), calendar: cal)
check(TIMCore.dayKey(w.start, calendar: cal) == "2026-11-22", "week start sunday")
check(TIMCore.dayKey(w.end, calendar: cal) == "2026-11-29", "week end next sunday")

// Rules
let v1 = TIMRuleVersion(versionId: "v1", effectiveFrom: "2026-11-23", deleted: false, selectionId: "s",
                        mode: "weekly", dailyLimitMinutes: nil, weeklyLimitMinutes: [nil, 15, 30, 30, 30, 30, nil])
let v2 = TIMRuleVersion(versionId: "v2", effectiveFrom: "2026-11-24", deleted: true, selectionId: "s",
                        mode: "daily", dailyLimitMinutes: nil, weeklyLimitMinutes: [nil, nil, nil, nil, nil, nil, nil])
let rule = TIMRule(id: "r1", name: "X", versions: [v1, v2])
check(TIMCore.effectiveVersion(rule, dayKey: "2026-11-22") == nil, "not yet effective")
check(TIMCore.effectiveVersion(rule, dayKey: "2026-11-23")?.versionId == "v1", "effective today")
check(TIMCore.effectiveVersion(rule, dayKey: "2026-11-24") == nil, "deleted tomorrow")
check(TIMCore.todaysLimit(rule, now: date(2026, 11, 23, 10), calendar: cal)?.minutes == 15, "monday 15")
let sundayRule = TIMRule(id: "r2", name: "Y", versions: [TIMRuleVersion(versionId: "a", effectiveFrom: "2026-01-01", deleted: false, selectionId: "s", mode: "weekly", dailyLimitMinutes: nil, weeklyLimitMinutes: [nil, 15, 30, 30, 30, 30, nil])])
check(TIMCore.todaysLimit(sundayRule, now: date(2026, 11, 22, 10), calendar: cal) == nil, "sunday no limit")

// Late events from yesterday are rejected
check(!TIMCore.isPlausibleForToday(thresholdMinutes: 120, now: date(2026, 11, 23, 0, 3), calendar: cal), "2h at 00:03")
check(TIMCore.isPlausibleForToday(thresholdMinutes: 120, now: date(2026, 11, 23, 2, 0), calendar: cal), "2h at 02:00")
check(TIMCore.isPlausibleForToday(thresholdMinutes: 20, now: date(2026, 11, 23, 0, 19), calendar: cal), "1min tolerance")

// Names
let parsed = TIMCore.parseRuleActivity(TIMCore.ruleActivityName(ruleId: "abc.def", generation: 12))
check(parsed?.ruleId == "abc.def" && parsed?.generation == 12, "activity roundtrip")
check(TIMCore.parseRuleActivity("tim.total") == nil, "total is not a rule")
check(TIMCore.parseUsageEvent("h4") == 4 && TIMCore.parseUsageEvent("h5") == nil, "usage events")

// Dedupe
var map: [String: [Int]] = [:]
var r = TIMCore.markNotified(map, dayKey: "2026-11-23", hours: 4); map = r.map
check(r.isNew, "first notify")
r = TIMCore.markNotified(map, dayKey: "2026-11-23", hours: 4); map = r.map
check(!r.isNew, "duplicate suppressed")
r = TIMCore.markNotified(map, dayKey: "2026-11-24", hours: 4)
check(r.isNew, "new day notifies again")

// Config JSON written by TypeScript decodes
let json = """
{"schemaVersion":1,"hourlyRateYen":1500,"onboardingCompleted":true,"rules":[{"id":"r1","name":"X","versions":[{"versionId":"v","effectiveFrom":"2026-11-23","deleted":false,"selectionId":"s","mode":"weekly","dailyLimitMinutes":null,"weeklyLimitMinutes":[null,20,20,20,20,20,null]}]}],"bulkUnlock":{"active":false,"generation":3,"changedAt":null}}
"""
let cfg = TIMCore.decodeConfig(json.data(using: .utf8))
check(cfg?.hourlyRateYen == 1500 && cfg?.bulkUnlock.generation == 3, "decode config")
check(cfg?.rules.first?.versions.first?.weeklyLimitMinutes[1] == 20, "decode weekly")

if failures == 0 { print("TIMCore: all checks passed") } else { print("TIMCore: \(failures) failure(s)"); exit(1) }
