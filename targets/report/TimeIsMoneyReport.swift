// TimeIsMoneyReport.swift
// DeviceActivityReport extension: aggregates and renders usage + yen.
// The data stays inside this extension (Apple's privacy model); the app only
// embeds the rendered view.

import DeviceActivity
import SwiftUI

@main
struct TimeIsMoneyReport: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    UsageReportScene(context: .timToday) { UsageReportView(summary: $0) }
    UsageReportScene(context: .timWeek) { UsageReportView(summary: $0) }
    UsageReportScene(context: .timTotal) { UsageReportView(summary: $0) }
  }
}

struct UsageReportScene: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context
  let content: (UsageSummary) -> UsageReportView

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> UsageSummary {
    let kind: UsageSummary.Kind =
      context == .timWeek ? .week : (context == .timTotal ? .total : .today)
    var builder = UsageSummaryBuilder(kind: kind, now: Date())
    for await deviceData in data {
      for await segment in deviceData.activitySegments {
        builder.addSegment(start: segment.dateInterval.start, duration: segment.totalActivityDuration)
        for await category in segment.categories {
          for await app in category.applications {
            builder.addApp(token: app.application.token,
                           key: app.application.bundleIdentifier ?? app.application.localizedDisplayName ?? "?",
                           name: app.application.localizedDisplayName,
                           duration: app.totalActivityDuration)
          }
        }
      }
    }
    return builder.build(rateYen: TIMStore.shared.loadConfig().hourlyRateYen)
  }
}
