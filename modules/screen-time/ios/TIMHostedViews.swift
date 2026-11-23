// TIMHostedViews.swift
// Native views embedded in React Native:
//  - TIMUsageReport: hosts DeviceActivityReport (rendered by the report extension)
//  - TIMSelectionLabel: shows app icons/names of a stored selection via Label(token)

import DeviceActivity
import ExpoModulesCore
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

// MARK: - Base hosting view

// Non-generic on purpose: ExpoView is an Objective-C class and generic
// subclasses are not reliably visible to the Objective-C runtime.
class TIMSwiftUIHostView: ExpoView {
  private var host: UIHostingController<AnyView>?

  func setRoot(_ view: AnyView) {
    if let host = host {
      host.rootView = view
      return
    }
    let h = UIHostingController(rootView: view)
    h.view.backgroundColor = .clear
    h.view.translatesAutoresizingMaskIntoConstraints = true
    h.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    h.view.frame = bounds
    addSubview(h.view)
    host = h
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    host?.view.frame = bounds
  }
}

// MARK: - Usage report

final class UsageReportModel: ObservableObject {
  @Published var range: String = "today"
  @Published var refreshToken: Int = 0
}

struct UsageReportHost: View {
  @ObservedObject var model: UsageReportModel

  var body: some View {
    ZStack(alignment: .top) {
      // Skeleton while the report extension renders (no blocking spinner, HIG 8.2).
      ReportSkeleton()
      let report = TIMReportFilters.filter(range: model.range)
      DeviceActivityReport(report.0, filter: report.1)
        .id("\(model.range)-\(model.refreshToken)")
    }
    .background(Color(.systemBackground))
  }
}

struct ReportSkeleton: View {
  var body: some View {
    // Same shape as the meter while the extension renders (no spinner).
    VStack(alignment: .leading, spacing: 14) {
      Text("¥12,345").font(.system(size: 56, weight: .bold, design: .rounded))
      Text("今日 2時間30分").font(.subheadline)
      Capsule().frame(height: 10)
      VStack(alignment: .leading, spacing: 18) {
        ForEach(0..<4, id: \.self) { _ in HStack { Text("アプリの名前"); Spacer(); Text("¥1,234") } }
      }
      .padding(.top, 20)
    }
    .redacted(reason: .placeholder)
    .padding(.horizontal, 20)
    .padding(.vertical, 4)
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityLabel("利用データを取得中")
  }
}

final class TIMUsageReportView: TIMSwiftUIHostView {
  let model = UsageReportModel()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setRoot(AnyView(UsageReportHost(model: model)))
  }
}

public final class TIMUsageReportModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TIMUsageReport")
    View(TIMUsageReportView.self) {
      Prop("range") { (view: TIMUsageReportView, range: String) in
        view.model.range = range
      }
      Prop("refreshToken") { (view: TIMUsageReportView, token: Int) in
        view.model.refreshToken = token
      }
    }
  }
}

// MARK: - Selection label

final class SelectionLabelModel: ObservableObject {
  @Published var selectionId: String?
  @Published var maxIcons: Int = 6
  @Published var showTitles: Bool = false
}

struct SelectionLabelContent: View {
  @ObservedObject var model: SelectionLabelModel

  var body: some View {
    let sel = model.selectionId.flatMap { TIMSelections.load($0) }
    let apps = Array(sel?.applicationTokens ?? [])
    let cats = Array(sel?.categoryTokens ?? [])
    let webs = Array(sel?.webDomainTokens ?? [])
    let total = apps.count + cats.count + webs.count
    Group {
      if sel == nil {
        Text("未選択").font(.footnote).foregroundStyle(.secondary)
      } else if model.showTitles {
        VStack(alignment: .leading, spacing: 4) {
          ForEach(Array(apps.prefix(model.maxIcons)), id: \.self) { Label($0) }
          ForEach(Array(cats.prefix(model.maxIcons)), id: \.self) { Label($0) }
          ForEach(Array(webs.prefix(model.maxIcons)), id: \.self) { Label($0) }
        }
        .font(.subheadline)
      } else {
        HStack(spacing: 4) {
          ForEach(Array(apps.prefix(model.maxIcons)), id: \.self) {
            Label($0).labelStyle(.iconOnly).frame(width: 26, height: 26)
          }
          ForEach(Array(cats.prefix(max(0, model.maxIcons - apps.count))), id: \.self) {
            Label($0).labelStyle(.iconOnly).frame(width: 26, height: 26)
          }
          ForEach(Array(webs.prefix(max(0, model.maxIcons - apps.count - cats.count))), id: \.self) {
            Label($0).labelStyle(.iconOnly).frame(width: 26, height: 26)
          }
          if total > model.maxIcons {
            Text("+\(total - model.maxIcons)").font(.caption).foregroundStyle(.secondary)
          }
          Spacer(minLength: 0)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

final class TIMSelectionLabelView: TIMSwiftUIHostView {
  let model = SelectionLabelModel()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setRoot(AnyView(SelectionLabelContent(model: model)))
  }
}

public final class TIMSelectionLabelModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TIMSelectionLabel")
    View(TIMSelectionLabelView.self) {
      Prop("selectionId") { (view: TIMSelectionLabelView, id: String?) in
        view.model.selectionId = id
      }
      Prop("maxIcons") { (view: TIMSelectionLabelView, n: Int) in
        view.model.maxIcons = n
      }
      Prop("showTitles") { (view: TIMSelectionLabelView, v: Bool) in
        view.model.showTitles = v
      }
    }
  }
}
