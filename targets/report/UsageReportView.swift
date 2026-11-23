// UsageReportView.swift
// The meter (docs/DESIGN.md): one large yen figure over a 0–24h ruler whose ticks are
// the 2-hour notification points. Quiet everywhere else: system background, hairlines,
// no cards, one copper accent.
import Charts
import FamilyControls
import ManagedSettings
import SwiftUI

/// Copper accent (light #A8541A / dark #F0A35E), same as the app.
let timAccent = Color(UIColor { trait in
  trait.userInterfaceStyle == .dark
    ? UIColor(red: 0xF0 / 255, green: 0xA3 / 255, blue: 0x5E / 255, alpha: 1)
    : UIColor(red: 0xA8 / 255, green: 0x54 / 255, blue: 0x1A / 255, alpha: 1)
})

struct UsageReportView: View {
  let summary: UsageSummary

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 28) {
        meter
        if summary.hasData {
          if summary.kind == .week { weekChart }
          apps
        } else {
          Text("この期間の利用データはまだありません。しばらくしてから開き直してください。")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        footnote
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 4)
    }
    .scrollIndicators(.hidden)
    .background(Color(.systemBackground))
  }

  // MARK: Meter

  private var meter: some View {
    VStack(alignment: .leading, spacing: 14) {
      VStack(alignment: .leading, spacing: 2) {
        if summary.hasData, let yen = summary.yen(summary.totalSeconds) {
          Text("¥\(TIMCore.formatYen(yen))")
            .font(.system(size: 56, weight: .bold, design: .rounded))
            .monospacedDigit()
            .minimumScaleFactor(0.5)
            .lineLimit(1)
            .accessibilityLabel("\(TIMCore.formatYen(yen))円")
        } else {
          Text("¥ --")
            .font(.system(size: 56, weight: .bold, design: .rounded))
            .foregroundStyle(.tertiary)
            .accessibilityLabel(summary.hasData ? "単価が未設定" : "データなし")
        }
        Text(subline)
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .monospacedDigit()
      }
      if summary.kind == .today {
        ruler(hours: summary.hasData ? summary.totalSeconds / 3600 : nil)
        if let next = nextThresholdText { Text(next).font(.footnote).foregroundStyle(.secondary).monospacedDigit() }
      }
    }
  }

  private var subline: String {
    let scope: String
    switch summary.kind {
    case .today: scope = "今日"
    case .week: scope = "今週（日〜土）"
    case .total: scope = "累計"
    }
    let time = summary.hasData ? formatSeconds(summary.totalSeconds) : "0分"
    return summary.hasData ? "\(scope) \(time)" : "\(scope)のデータなし"
  }

  /// "次の区切り 4時間まで あと1時間06分" (the next yen notification point).
  private var nextThresholdText: String? {
    guard summary.hasData else { return nil }
    let minutes = Int(summary.totalSeconds / 60)
    guard let next = TIMConstants.usageThresholdHours.first(where: { $0 * 60 > minutes }) else { return nil }
    return "次の区切り \(next)時間まで あと\(TIMCore.formatDuration(minutes: next * 60 - minutes))"
  }

  private func ruler(hours: Double?) -> some View {
    VStack(spacing: 6) {
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule().fill(timAccent.opacity(0.14))
          Capsule().fill(timAccent).frame(width: geo.size.width * min(1, max(0, (hours ?? 0) / 24)))
          ForEach(1..<12, id: \.self) { i in
            Rectangle()
              .fill(Color(.systemBackground).opacity(0.9))
              .frame(width: 1.5, height: 6)
              .offset(x: geo.size.width * CGFloat(i * 2) / 24 - 0.75)
          }
        }
      }
      .frame(height: 10)
      HStack {
        ForEach(["0", "6", "12", "18", "24h"], id: \.self) { l in
          Text(l).font(.caption2).foregroundStyle(.tertiary).monospacedDigit()
          if l != "24h" { Spacer() }
        }
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(hours.map { "今日の利用 \(String(format: "%.1f", $0))時間" } ?? "利用時間は未取得")
  }

  // MARK: Week

  private var weekChart: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("日ごと").font(.headline)
      Chart(summary.days) { day in
        BarMark(x: .value("曜日", weekdayLabel(day.day)), y: .value("時間", (day.seconds ?? 0) / 3600))
          .cornerRadius(4)
          .foregroundStyle(isToday(day.day) ? timAccent : timAccent.opacity(0.3))
      }
      .chartYAxis {
        AxisMarks(position: .trailing) { value in
          AxisGridLine().foregroundStyle(Color(.separator))
          AxisValueLabel { if let h = value.as(Double.self) { Text("\(Int(h))h").font(.caption2) } }
        }
      }
      .frame(height: 160)
      HStack(spacing: 0) {
        ForEach(summary.days) { day in
          Text(dayCaption(day))
            .font(.caption2.weight(isToday(day.day) ? .semibold : .regular))
            .foregroundStyle(isToday(day.day) ? .primary : .secondary)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: .infinity)
        }
      }
    }
  }

  private func dayCaption(_ day: DayUsage) -> String {
    if day.isFuture { return "" }
    guard let s = day.seconds else { return "なし" }
    if let yen = summary.yen(s) { return "¥\(TIMCore.formatYen(yen))" }
    return formatSeconds(s)
  }

  // MARK: Apps

  private var apps: some View {
    let maxSeconds = summary.apps.map(\.seconds).max() ?? 1
    return VStack(alignment: .leading, spacing: 0) {
      Text("アプリ").font(.headline).padding(.bottom, 8)
      if summary.apps.isEmpty {
        Text("アプリ別の内訳はありません。").font(.subheadline).foregroundStyle(.secondary)
      }
      ForEach(Array(summary.apps.enumerated()), id: \.element.id) { index, app in
        if index > 0 { Divider() }
        HStack(spacing: 12) {
          Group {
            if let token = app.token { Label(token).labelStyle(.iconOnly) } else { Color.clear }
          }
          .frame(width: 28, height: 28)
          VStack(alignment: .leading, spacing: 6) {
            Group {
              if let name = app.name { Text(name) } else if let token = app.token { Label(token).labelStyle(.titleOnly) } else { Text("不明なアプリ") }
            }
            .font(.body)
            .lineLimit(1)
            GeometryReader { geo in
              Capsule().fill(timAccent.opacity(0.8)).frame(width: max(3, geo.size.width * app.seconds / maxSeconds), height: 3)
            }
            .frame(height: 3)
          }
          VStack(alignment: .trailing, spacing: 2) {
            if let yen = summary.yen(app.seconds) { Text("¥\(TIMCore.formatYen(yen))").font(.body.weight(.semibold)) }
            Text(formatSeconds(app.seconds)).font(.footnote).foregroundStyle(.secondary)
          }
          .monospacedDigit()
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
      }
    }
  }

  private var footnote: some View {
    VStack(alignment: .leading, spacing: 4) {
      if let rate = summary.rateYen, rate > 0 {
        Text("1時間 \(TIMCore.formatYen(rate))円で換算。過去の分も今の値で計算します。")
      } else {
        Text("1時間の価値を設定すると金額で表示します。")
      }
      if summary.kind == .total {
        if let s = summary.periodStart, let e = summary.periodEnd {
          Text("集計期間 \(dateText(s))〜\(dateText(e))（データのある日 \(summary.daysWithData)日）。iOSが保持している範囲だけを数え、データのない日を0分とはしません。")
        } else {
          Text("iOSから取得できる利用履歴がありません。")
        }
      } else if summary.kind == .week {
        let week = TIMCore.weekInterval(containing: Date())
        let end = Calendar.current.date(byAdding: .day, value: -1, to: week.end)!
        Text("集計期間 \(dateText(week.start))〜\(dateText(end))")
      }
    }
    .font(.footnote)
    .foregroundStyle(.secondary)
  }

  // MARK: Helpers

  private func formatSeconds(_ s: TimeInterval) -> String { TIMCore.formatDuration(minutes: Int((s / 60).rounded())) }

  private func dateText(_ d: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "ja_JP")
    f.dateFormat = "M月d日"
    return f.string(from: d)
  }

  private func isToday(_ d: Date) -> Bool { Calendar.current.isDateInToday(d) }
  private func weekdayLabel(_ d: Date) -> String { ["日", "月", "火", "水", "木", "金", "土"][TIMCore.weekdayIndex(d)] }
}
