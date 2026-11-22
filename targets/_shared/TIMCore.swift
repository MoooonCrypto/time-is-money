// TIMCore.swift
// Foundation-only logic shared by the app module and every extension.
// Keep this file free of Apple-only frameworks so it can be unit-tested
// with `swift` on Linux/macOS (see scripts/swift-core-tests).
//
// The JSON schema decoded here is written by TypeScript
// (src/domain/config.ts). Keep both sides in sync.

import Foundation

public enum TIMConstants {
  /// UserDefaults keys inside the App Group suite.
  public static let configKey = "tim.config.v1"            // written by JS only
  public static let shieldStateKey = "tim.shieldState.v1"  // written by native only
  public static let notifiedKey = "tim.usageNotified.v1"   // written by monitor extension
  public static let monitorStateKey = "tim.monitorState.v1" // written by native only
  public static let eventLogKey = "tim.eventLog.v1"        // diagnostics ring buffer
  public static let selectionKeyPrefix = "tim.selection."

  public static let totalActivityName = "tim.total"
  public static let ruleActivityPrefix = "tim.rule."
  public static let ruleLimitEventName = "limit"
  public static let usageEventPrefix = "h"

  /// Cumulative whole-iPhone usage thresholds (hours) that trigger a notification.
  public static let usageThresholdHours: [Int] = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]

  /// Upper bound on rules; DeviceActivityCenter rejects "too many" activities
  /// (MonitoringError.excessiveActivities, no documented number).
  public static let maxRules = 15

  public static let usageNotificationPrefix = "tim.usage."

  /// DeviceActivityReport contexts (host view <-> report extension).
  public static let reportContextToday = "tim.today"
  public static let reportContextWeek = "tim.week"
  public static let reportContextTotal = "tim.total"
  /// How far back the "累計" report asks iOS for history. iOS returns only what
  /// it still retains; the extension shows the actual covered period.
  public static let totalLookbackDays = 365
  public static let statsDeepLink = "timeismoney://stats?range=today"
}

// MARK: - Config (decoded from JSON written by TypeScript)

public struct TIMConfig: Codable, Equatable {
  public var schemaVersion: Int
  public var hourlyRateYen: Int?
  public var onboardingCompleted: Bool?
  public var rules: [TIMRule]
  public var bulkUnlock: TIMBulkUnlock
  /// Development only. Ignored unless the native code is compiled with DEBUG.
  public var debugShortThresholds: Bool?

  public static let empty = TIMConfig(
    schemaVersion: 1, hourlyRateYen: nil, onboardingCompleted: false, rules: [],
    bulkUnlock: TIMBulkUnlock(active: false, generation: 0, changedAt: nil),
    debugShortThresholds: nil)
}

public struct TIMRule: Codable, Equatable {
  public var id: String
  public var name: String
  public var versions: [TIMRuleVersion]
}

public struct TIMRuleVersion: Codable, Equatable {
  public var versionId: String
  /// Local calendar day "yyyy-MM-dd" from which this version applies.
  public var effectiveFrom: String
  public var deleted: Bool
  public var selectionId: String?
  /// "daily" or "weekly"
  public var mode: String
  public var dailyLimitMinutes: Int?
  /// Index 0 = Sunday ... 6 = Saturday. nil = no limit that day.
  public var weeklyLimitMinutes: [Int?]
}

public struct TIMBulkUnlock: Codable, Equatable {
  public var active: Bool
  public var generation: Int
  public var changedAt: String?
}

// MARK: - Native-owned state

public struct TIMShieldRecord: Codable, Equatable {
  public var ruleId: String
  public var dayKey: String
  public var limitMinutes: Int
  public var generation: Int
  public var selectionId: String
  public var appliedAt: Date
}

public struct TIMMonitorRecord: Codable, Equatable {
  public var activity: String
  public var dayKey: String
  public var signature: String
  public var limitMinutes: Int?
}

public struct TIMMonitorState: Codable, Equatable {
  public var records: [String: TIMMonitorRecord] = [:]
  public var lastSyncAt: Date?
  public var lastError: String?
  public var warnings: [String] = []
  public init() {}
}

// MARK: - Pure logic

public enum TIMCore {
  /// Gregorian calendar in the device time zone with Sunday as first weekday.
  public static func calendar(timeZone: TimeZone = .current) -> Calendar {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = timeZone
    cal.firstWeekday = 1
    cal.locale = Locale(identifier: "ja_JP")
    return cal
  }

  public static func dayKey(_ date: Date, calendar: Calendar = TIMCore.calendar()) -> String {
    let c = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
  }

  /// 0 = Sunday ... 6 = Saturday
  public static func weekdayIndex(_ date: Date, calendar: Calendar = TIMCore.calendar()) -> Int {
    return calendar.component(.weekday, from: date) - 1
  }

  /// Latest version whose effectiveFrom <= dayKey (array order breaks ties).
  /// Returns nil when the rule does not exist yet or is deleted on that day.
  public static func effectiveVersion(_ rule: TIMRule, dayKey: String) -> TIMRuleVersion? {
    var found: TIMRuleVersion?
    for v in rule.versions where v.effectiveFrom <= dayKey {
      found = v
    }
    if let f = found, f.deleted { return nil }
    return found
  }

  public static func limitMinutes(_ version: TIMRuleVersion, weekday: Int) -> Int? {
    let raw: Int?
    if version.mode == "weekly" {
      raw = weekday >= 0 && weekday < version.weeklyLimitMinutes.count
        ? version.weeklyLimitMinutes[weekday] : nil
    } else {
      raw = version.dailyLimitMinutes
    }
    guard let m = raw, m > 0 else { return nil }
    return m
  }

  /// Today's limit for a rule, or nil (no limit today / rule not active).
  public static func todaysLimit(_ rule: TIMRule, now: Date, calendar: Calendar = TIMCore.calendar())
    -> (version: TIMRuleVersion, minutes: Int)?
  {
    let key = dayKey(now, calendar: calendar)
    guard let v = effectiveVersion(rule, dayKey: key),
      let m = limitMinutes(v, weekday: weekdayIndex(now, calendar: calendar))
    else { return nil }
    return (v, m)
  }

  /// A threshold event can only belong to *today* if at least `thresholdMinutes`
  /// have elapsed since local midnight. Anything else is a late delivery from
  /// the previous interval and must be ignored (no shield, no notification).
  public static func isPlausibleForToday(thresholdMinutes: Int, now: Date,
                                         calendar: Calendar = TIMCore.calendar()) -> Bool {
    let start = calendar.startOfDay(for: now)
    let elapsed = now.timeIntervalSince(start)
    return elapsed + 60 >= Double(thresholdMinutes) * 60  // 1 min tolerance
  }

  // MARK: Activity / event names

  public static func ruleActivityName(ruleId: String, generation: Int) -> String {
    return "\(TIMConstants.ruleActivityPrefix)\(ruleId).g\(generation)"
  }

  /// Parses "tim.rule.<ruleId>.g<generation>".
  public static func parseRuleActivity(_ name: String) -> (ruleId: String, generation: Int)? {
    guard name.hasPrefix(TIMConstants.ruleActivityPrefix) else { return nil }
    let rest = String(name.dropFirst(TIMConstants.ruleActivityPrefix.count))
    guard let dot = rest.range(of: ".g", options: .backwards) else { return nil }
    let ruleId = String(rest[rest.startIndex..<dot.lowerBound])
    guard !ruleId.isEmpty, let gen = Int(rest[dot.upperBound...]) else { return nil }
    return (ruleId, gen)
  }

  public static func usageEventName(hours: Int) -> String {
    return "\(TIMConstants.usageEventPrefix)\(hours)"
  }

  public static func parseUsageEvent(_ name: String) -> Int? {
    guard name.hasPrefix(TIMConstants.usageEventPrefix) else { return nil }
    guard let h = Int(name.dropFirst(TIMConstants.usageEventPrefix.count)),
      TIMConstants.usageThresholdHours.contains(h)
    else { return nil }
    return h
  }

  // MARK: Money / text

  public static func yen(rate: Int, minutes: Int) -> Int {
    return Int((Double(rate) * Double(minutes) / 60.0).rounded())
  }

  public static func formatYen(_ value: Int) -> String {
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.groupingSeparator = ","
    f.groupingSize = 3
    f.usesGroupingSeparator = true
    f.locale = Locale(identifier: "en_US_POSIX")
    return f.string(from: NSNumber(value: value)) ?? String(value)
  }

  /// "今日は6,000円分／4時間をスマホに浪費しました。"
  public static func usageNotificationBody(rate: Int?, hours: Int) -> String {
    if let rate = rate, rate > 0 {
      let amount = formatYen(yen(rate: rate, minutes: hours * 60))
      return "今日は\(amount)円分／\(hours)時間をスマホに浪費しました。"
    }
    return "今日は\(hours)時間をスマホに使いました。時間の単価を設定すると円換算で表示されます。"
  }

  public static func usageNotificationIdentifier(dayKey: String, hours: Int) -> String {
    return "\(TIMConstants.usageNotificationPrefix)\(dayKey).h\(hours)"
  }

  /// Shield subtitle. App names are not always available from public API,
  /// so the text works with or without one.
  public static func shieldSubtitle(limitMinutes: Int?) -> String {
    if let m = limitMinutes {
      return "今日の利用枠\(formatDuration(minutes: m))を使い切りました。明日また使えます。"
    }
    return "今日の利用枠を使い切りました。明日また使えます。"
  }

  public static func formatDuration(minutes: Int) -> String {
    if minutes < 60 { return "\(minutes)分" }
    let h = minutes / 60
    let m = minutes % 60
    return m == 0 ? "\(h)時間" : "\(h)時間\(m)分"
  }

  /// Deduplicates usage notifications: returns the updated map and whether
  /// the (dayKey, hours) pair is new. Keeps only the most recent `keepDays` days.
  public static func markNotified(_ map: [String: [Int]], dayKey: String, hours: Int,
                                  keepDays: Int = 7) -> (map: [String: [Int]], isNew: Bool) {
    var m = map
    var list = m[dayKey] ?? []
    if list.contains(hours) { return (m, false) }
    list.append(hours)
    list.sort()
    m[dayKey] = list
    let keys = m.keys.sorted()
    if keys.count > keepDays {
      for k in keys.prefix(keys.count - keepDays) { m.removeValue(forKey: k) }
    }
    return (m, true)
  }

  /// Signature used to decide whether a rule's monitor must be (re)registered.
  public static func ruleMonitorSignature(dayKey: String, limitMinutes: Int?, generation: Int,
                                          selectionId: String?) -> String {
    return "day=\(dayKey);limit=\(limitMinutes.map(String.init) ?? "none");gen=\(generation);sel=\(selectionId ?? "-")"
  }

  /// Sunday 00:00 ... next Sunday 00:00 containing `date`.
  public static func weekInterval(containing date: Date, calendar: Calendar = TIMCore.calendar()) -> DateInterval {
    let startOfDay = calendar.startOfDay(for: date)
    let weekday = calendar.component(.weekday, from: startOfDay)  // 1 = Sunday
    let start = calendar.date(byAdding: .day, value: -(weekday - 1), to: startOfDay)!
    let end = calendar.date(byAdding: .day, value: 7, to: start)!
    return DateInterval(start: start, end: end)
  }

  public static func dayInterval(containing date: Date, calendar: Calendar = TIMCore.calendar()) -> DateInterval {
    let start = calendar.startOfDay(for: date)
    let end = calendar.date(byAdding: .day, value: 1, to: start)!
    return DateInterval(start: start, end: end)
  }

  public static func decodeConfig(_ data: Data?) -> TIMConfig? {
    guard let data = data else { return nil }
    return try? JSONDecoder().decode(TIMConfig.self, from: data)
  }
}
