// UsageSummary.swift
import Foundation
import ManagedSettings

struct AppUsage: Identifiable {
  let id: String
  let token: ApplicationToken?
  let name: String?
  var seconds: TimeInterval
}

struct DayUsage: Identifiable {
  var id: Date { day }
  let day: Date
  /// nil = iOS returned no data for that day (not the same as 0 minutes).
  let seconds: TimeInterval?
  let isFuture: Bool
}

struct UsageSummary {
  enum Kind { case today, week, total }
  let kind: Kind
  let totalSeconds: TimeInterval
  let hasData: Bool
  let apps: [AppUsage]
  let days: [DayUsage]           // week only
  let periodStart: Date?
  let periodEnd: Date?
  let daysWithData: Int
  let rateYen: Int?

  func yen(_ seconds: TimeInterval) -> Int? {
    guard let rate = rateYen, rate > 0 else { return nil }
    return TIMCore.yen(rate: rate, minutes: Int((seconds / 60).rounded()))
  }
}

struct UsageSummaryBuilder {
  let kind: UsageSummary.Kind
  let now: Date
  let cal = TIMCore.calendar()
  var total: TimeInterval = 0
  var segmentCount = 0
  var perDay: [Date: TimeInterval] = [:]
  var perApp: [String: AppUsage] = [:]

  init(kind: UsageSummary.Kind, now: Date) {
    self.kind = kind
    self.now = now
  }

  mutating func addSegment(start: Date, duration: TimeInterval) {
    segmentCount += 1
    total += duration
    perDay[cal.startOfDay(for: start), default: 0] += duration
  }

  mutating func addApp(token: ApplicationToken?, key: String, name: String?, duration: TimeInterval) {
    if var existing = perApp[key] {
      existing.seconds += duration
      perApp[key] = existing
    } else {
      perApp[key] = AppUsage(id: key, token: token, name: name, seconds: duration)
    }
  }

  func build(rateYen: Int?) -> UsageSummary {
    let apps = perApp.values.filter { $0.seconds >= 60 }.sorted { $0.seconds > $1.seconds }
    var days: [DayUsage] = []
    if kind == .week {
      let week = TIMCore.weekInterval(containing: now, calendar: cal)
      let today = cal.startOfDay(for: now)
      for i in 0..<7 {
        let d = cal.date(byAdding: .day, value: i, to: week.start)!
        days.append(DayUsage(day: d, seconds: perDay[d], isFuture: d > today))
      }
    }
    let dataDays = perDay.filter { $0.value > 0 }.keys.sorted()
    return UsageSummary(
      kind: kind, totalSeconds: total, hasData: segmentCount > 0 && total > 0,
      apps: Array(apps.prefix(30)), days: days,
      periodStart: dataDays.first, periodEnd: dataDays.last,
      daysWithData: dataDays.count, rateYen: rateYen)
  }
}
