// TIMReportFilters.swift (app module only)
// Builds the DeviceActivityFilter for each range shown in the app. Kept out of
// targets/_shared so the memory-limited monitor/shield extensions do not link
// SwiftUI. Usage numbers are aggregated and rendered inside the report
// extension only; they are never exported to the app, TypeScript or the App Group.

import DeviceActivity
import Foundation
import SwiftUI

@available(iOS 16.0, *)
extension DeviceActivityReport.Context {
  static let timToday = Self(TIMConstants.reportContextToday)
  static let timWeek = Self(TIMConstants.reportContextWeek)
  static let timTotal = Self(TIMConstants.reportContextTotal)
}

@available(iOS 16.0, *)
public enum TIMReportFilters {
  static func filter(range: String, now: Date = Date()) -> (DeviceActivityReport.Context, DeviceActivityFilter) {
    let cal = TIMCore.calendar()
    let devices = DeviceActivityFilter.Devices([.iPhone])
    switch range {
    case "week":
      return (.timWeek, DeviceActivityFilter(
        segment: .daily(during: TIMCore.weekInterval(containing: now, calendar: cal)),
        users: .all, devices: devices))
    case "total":
      let today = TIMCore.dayInterval(containing: now, calendar: cal)
      let start = cal.date(byAdding: .day, value: -TIMConstants.totalLookbackDays, to: today.start)!
      return (.timTotal, DeviceActivityFilter(
        segment: .daily(during: DateInterval(start: start, end: today.end)),
        users: .all, devices: devices))
    default:
      return (.timToday, DeviceActivityFilter(
        segment: .daily(during: TIMCore.dayInterval(containing: now, calendar: cal)),
        users: .all, devices: devices))
    }
  }
}
