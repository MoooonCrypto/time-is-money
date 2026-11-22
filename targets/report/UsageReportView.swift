// UsageReportView.swift
import Charts
import FamilyControls
import ManagedSettings
import SwiftUI

struct UsageReportView: View {
  let summary: UsageSummary

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        header
        if !summary.hasData {
          emptyState
        } else {
          if summary.kind == .week { weekChart }
          appList
        }
        rateFootnote
      }
      .padding(16)
    }
    .background(Color(.systemBackground))
  }

  // MARK: Header

  private var title: String {
    switch summary.kind {
    case .today: return "今日のiPhone全体"
    case .week: return "今週のiPhone全体（日〜土）"
    case .total: return "累計のiPhone全体"
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(title).font(.subheadline).foregroundStyle(.secondary)
      if summary.hasData {
        if let yen = summary.yen(summary.totalSeconds) {
          Text("\(TIMCore.formatYen(yen))円")
            .font(.system(size: 40, weight: .heavy, design: .rounded))
        } else {
          Text("単価未設定").font(.title2.bold())
        }
        Text("合計 \(formatSeconds(summary.totalSeconds))").font(.headline)
      }
      periodLabel
    }
  }

  @ViewBuilder private var periodLabel: some View {
    switch summary.kind {
    case .today:
      Text("集計期間：今日 \(dateText(Date()))").font(.caption).foregroundStyle(.secondary)
    case .week:
      let week = TIMCore.weekInterval(containing: Date())
      let end = Calendar.current.date(byAdding: .day, value: -1, to: week.end)!
      Text("集計期間：\(dateText(week.start))〜\(dateText(end))").font(.caption).foregroundStyle(.secondary)
    case .total:
      if let s = summary.periodStart, let e = summary.periodEnd {
        Text("集計期間：\(dateText(s))〜\(dateText(e))（データのある日：\(summary.daysWithData)日）")
          .font(.caption).foregroundStyle(.secondary)
        Text("iOSが保持している利用履歴の範囲だけを集計しています。それより前の利用は含まれません。データのない日は0分として扱っていません。")
          .font(.caption2).foregroundStyle(.secondary)
      } else {
        Text("iOSから取得できる利用履歴がありません。").font(.caption).foregroundStyle(.secondary)
      }
    }
  }

  private var emptyState: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("データなし").font(.title3.bold())
      Text("この期間の利用データはiOSからまだ取得できません。しばらくしてから再度開いてください。")
        .font(.footnote).foregroundStyle(.secondary)
    }
    .padding(.vertical, 12)
  }

  // MARK: Week chart

  private var weekChart: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("日別").font(.headline)
      Chart(summary.days) { day in
        if let s = day.seconds {
          BarMark(x: .value("曜日", weekdayLabel(day.day)), y: .value("分", s / 60))
            .foregroundStyle(Color.orange)
        } else {
          BarMark(x: .value("曜日", weekdayLabel(day.day)), y: .value("分", 0))
        }
      }
      .chartYAxisLabel("分")
      .frame(height: 180)
      HStack(spacing: 0) {
        ForEach(summary.days) { day in
          VStack(spacing: 2) {
            Text(weekdayLabel(day.day)).font(.caption2.bold())
            Text(dayCaption(day)).font(.caption2).foregroundStyle(.secondary)
          }
          .frame(maxWidth: .infinity)
        }
      }
    }
  }

  private func dayCaption(_ day: DayUsage) -> String {
    if day.isFuture { return "—" }
    guard let s = day.seconds else { return "データなし" }
    if let yen = summary.yen(s) { return "\(TIMCore.formatYen(yen))円" }
    return formatSeconds(s)
  }

  // MARK: Apps

  private var appList: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("アプリ別").font(.headline)
      if summary.apps.isEmpty {
        Text("アプリ別の内訳は取得できませんでした。").font(.footnote).foregroundStyle(.secondary)
      }
      ForEach(summary.apps) { app in
        HStack(spacing: 10) {
          if let token = app.token {
            Label(token).labelStyle(.iconOnly).frame(width: 28, height: 28)
          }
          if let name = app.name {
            Text(name).lineLimit(1)
          } else if let token = app.token {
            Label(token).labelStyle(.titleOnly).lineLimit(1)
          } else {
            Text("不明なアプリ")
          }
          Spacer()
          VStack(alignment: .trailing) {
            if let yen = summary.yen(app.seconds) {
              Text("\(TIMCore.formatYen(yen))円").font(.subheadline.bold())
            }
            Text(formatSeconds(app.seconds)).font(.caption).foregroundStyle(.secondary)
          }
        }
        Divider()
      }
    }
  }

  private var rateFootnote: some View {
    Group {
      if let rate = summary.rateYen, rate > 0 {
        Text("換算単価：\(TIMCore.formatYen(rate))円／時間（現在の設定で全期間を換算）")
      } else {
        Text("時間の単価が未設定のため、円換算を表示できません。")
      }
    }
    .font(.caption).foregroundStyle(.secondary)
  }

  // MARK: Formatting

  private func formatSeconds(_ s: TimeInterval) -> String {
    TIMCore.formatDuration(minutes: Int((s / 60).rounded()))
  }

  private func dateText(_ d: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "ja_JP")
    f.dateFormat = "yyyy/M/d"
    return f.string(from: d)
  }

  private func weekdayLabel(_ d: Date) -> String {
    ["日", "月", "火", "水", "木", "金", "土"][TIMCore.weekdayIndex(d)]
  }
}
