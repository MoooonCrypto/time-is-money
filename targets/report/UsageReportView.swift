// UsageReportView.swift
// Rendered inside the DeviceActivityReport extension. Design follows the HIG:
// grouped background, inset cards, semantic colors (light/dark), SF Symbols,
// rounded tabular numerals, one accent color (indigo).
import Charts
import FamilyControls
import ManagedSettings
import SwiftUI

private let accent = Color.indigo

struct UsageReportView: View {
  let summary: UsageSummary

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        hero
        if !summary.hasData {
          emptyState
        } else {
          if summary.kind == .week { weekCard }
          appsCard
        }
        footnote
      }
      .padding(.vertical, 4)
    }
    .scrollIndicators(.hidden)
    .background(Color(.systemGroupedBackground))
  }

  // MARK: Hero

  private var scopeTitle: String {
    switch summary.kind {
    case .today: return "今日"
    case .week: return "今週（日〜土）"
    case .total: return "累計"
    }
  }

  private var hero: some View {
    VStack(alignment: .leading, spacing: 10) {
      Label {
        Text("\(scopeTitle)のiPhone全体")
      } icon: {
        Image(systemName: "iphone")
      }
      .font(.subheadline.weight(.semibold))
      .foregroundStyle(.secondary)

      if summary.hasData {
        if let yen = summary.yen(summary.totalSeconds) {
          HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text(TIMCore.formatYen(yen))
              .font(.system(size: 48, weight: .bold, design: .rounded))
              .monospacedDigit()
              .minimumScaleFactor(0.5)
              .lineLimit(1)
            Text("円")
              .font(.system(size: 22, weight: .bold, design: .rounded))
          }
          .accessibilityElement(children: .combine)
          .accessibilityLabel("\(TIMCore.formatYen(yen))円")
        } else {
          Text("単価未設定").font(.title.bold())
        }
        HStack(spacing: 6) {
          Image(systemName: "clock.fill").foregroundStyle(accent)
          Text("合計 \(formatSeconds(summary.totalSeconds))")
            .monospacedDigit()
        }
        .font(.headline)
      }
      periodLabel
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(20)
    .background(cardBackground)
  }

  @ViewBuilder private var periodLabel: some View {
    switch summary.kind {
    case .today:
      Text(dateText(Date())).font(.footnote).foregroundStyle(.secondary)
    case .week:
      let week = TIMCore.weekInterval(containing: Date())
      let end = Calendar.current.date(byAdding: .day, value: -1, to: week.end)!
      Text("集計期間 \(dateText(week.start)) 〜 \(dateText(end))").font(.footnote).foregroundStyle(.secondary)
    case .total:
      if let s = summary.periodStart, let e = summary.periodEnd {
        VStack(alignment: .leading, spacing: 4) {
          Text("集計期間 \(dateText(s)) 〜 \(dateText(e))・データのある日 \(summary.daysWithData)日")
            .font(.footnote).foregroundStyle(.secondary)
          Text("iOSが保持している履歴の範囲だけを集計しています。それより前の利用は含まれず、データのない日を0分としては扱いません。")
            .font(.caption).foregroundStyle(.tertiary)
        }
      } else {
        Text("iOSから取得できる利用履歴がありません。").font(.footnote).foregroundStyle(.secondary)
      }
    }
  }

  private var emptyState: some View {
    VStack(spacing: 10) {
      Image(systemName: "chart.bar.xaxis")
        .font(.system(size: 34, weight: .semibold))
        .foregroundStyle(.tertiary)
      Text("データなし").font(.headline)
      Text("この期間の利用データはまだiOSから取得できません。しばらくしてからもう一度開いてください。")
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 28)
    .padding(.horizontal, 20)
    .background(cardBackground)
  }

  // MARK: Week chart

  private var weekCard: some View {
    VStack(alignment: .leading, spacing: 12) {
      sectionTitle("日別", systemImage: "calendar")
      Chart(summary.days) { day in
        BarMark(
          x: .value("曜日", weekdayLabel(day.day)),
          y: .value("時間", (day.seconds ?? 0) / 3600)
        )
        .cornerRadius(6)
        .foregroundStyle(isToday(day.day) ? accent : accent.opacity(0.35))
      }
      .chartYAxis {
        AxisMarks(position: .leading) { value in
          AxisGridLine().foregroundStyle(Color(.separator))
          AxisValueLabel {
            if let h = value.as(Double.self) { Text("\(Int(h))h").font(.caption2) }
          }
        }
      }
      .frame(height: 170)
      .accessibilityLabel("日別の利用時間")

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
    .padding(20)
    .background(cardBackground)
  }

  private func dayCaption(_ day: DayUsage) -> String {
    if day.isFuture { return "—" }
    guard let s = day.seconds else { return "なし" }
    if let yen = summary.yen(s) { return "¥\(TIMCore.formatYen(yen))" }
    return formatSeconds(s)
  }

  // MARK: Apps

  private var appsCard: some View {
    let maxSeconds = summary.apps.map(\.seconds).max() ?? 1
    return VStack(alignment: .leading, spacing: 4) {
      sectionTitle("アプリ別", systemImage: "square.grid.2x2")
        .padding(.bottom, 8)
      if summary.apps.isEmpty {
        Text("アプリ別の内訳は取得できませんでした。").font(.footnote).foregroundStyle(.secondary)
      }
      ForEach(Array(summary.apps.enumerated()), id: \.element.id) { index, app in
        if index > 0 { Divider().padding(.leading, 44) }
        HStack(spacing: 12) {
          Group {
            if let token = app.token {
              Label(token).labelStyle(.iconOnly)
            } else {
              Image(systemName: "app.fill").foregroundStyle(.tertiary)
            }
          }
          .frame(width: 32, height: 32)
          .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

          VStack(alignment: .leading, spacing: 5) {
            Group {
              if let name = app.name {
                Text(name)
              } else if let token = app.token {
                Label(token).labelStyle(.titleOnly)
              } else {
                Text("不明なアプリ")
              }
            }
            .font(.subheadline.weight(.medium))
            .lineLimit(1)
            GeometryReader { geo in
              Capsule()
                .fill(accent.opacity(0.85))
                .frame(width: max(4, geo.size.width * app.seconds / maxSeconds))
            }
            .frame(height: 4)
          }

          VStack(alignment: .trailing, spacing: 2) {
            if let yen = summary.yen(app.seconds) {
              Text("\(TIMCore.formatYen(yen))円").font(.subheadline.weight(.semibold))
            }
            Text(formatSeconds(app.seconds)).font(.caption).foregroundStyle(.secondary)
          }
          .monospacedDigit()
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
      }
    }
    .padding(20)
    .background(cardBackground)
  }

  private var footnote: some View {
    Label {
      if let rate = summary.rateYen, rate > 0 {
        Text("換算単価 \(TIMCore.formatYen(rate))円／時間（現在の設定で全期間を換算）")
      } else {
        Text("時間の単価が未設定のため、円換算を表示できません。")
      }
    } icon: {
      Image(systemName: "yensign.circle")
    }
    .font(.footnote)
    .foregroundStyle(.secondary)
    .padding(.horizontal, 16)
  }

  // MARK: Helpers

  private var cardBackground: some View {
    RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Color(.secondarySystemGroupedBackground))
  }

  private func sectionTitle(_ text: String, systemImage: String) -> some View {
    Label(text, systemImage: systemImage)
      .font(.headline)
      .foregroundStyle(.primary)
  }

  private func formatSeconds(_ s: TimeInterval) -> String {
    TIMCore.formatDuration(minutes: Int((s / 60).rounded()))
  }

  private func dateText(_ d: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "ja_JP")
    f.dateFormat = "M月d日(E)"
    return f.string(from: d)
  }

  private func isToday(_ d: Date) -> Bool { Calendar.current.isDateInToday(d) }

  private func weekdayLabel(_ d: Date) -> String {
    ["日", "月", "火", "水", "木", "金", "土"][TIMCore.weekdayIndex(d)]
  }
}
