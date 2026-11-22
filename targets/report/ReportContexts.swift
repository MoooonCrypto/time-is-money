// ReportContexts.swift
// Must match the contexts used by the app's host view (TIMReportFilters.swift).
import DeviceActivity
import SwiftUI

extension DeviceActivityReport.Context {
  static let timToday = Self(TIMConstants.reportContextToday)
  static let timWeek = Self(TIMConstants.reportContextWeek)
  static let timTotal = Self(TIMConstants.reportContextTotal)
}
