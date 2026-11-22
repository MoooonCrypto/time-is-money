// ScreenTimeModule.swift
// JS bridge for FamilyControls authorization, the app picker, config storage
// in the App Group, and (re)registration of DeviceActivity monitors / shields.
// Usage durations are NOT exposed here (they live only in the report extension).

import ExpoModulesCore
import FamilyControls
import Foundation
import SwiftUI

public final class ScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TIMScreenTime")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.0, *) { return true }
      return false
    }

    Function("getAppGroupInfo") { () -> [String: Any] in
      let store = TIMStore.shared
      return ["appGroup": store.appGroupIdentifier, "available": store.isAvailable]
    }

    // MARK: Authorization

    Function("getAuthorizationStatus") { () -> String in
      return Self.statusString()
    }

    AsyncFunction("requestAuthorization") { () async -> String in
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      } catch {
        TIMStore.shared.log("auth", "requestAuthorization error: \(error)")
      }
      return Self.statusString()
    }

    // MARK: Config

    Function("loadConfig") { () -> String? in
      return TIMStore.shared.loadConfigJSON()
    }

    Function("saveConfig") { (json: String) in
      TIMStore.shared.saveConfigJSON(json)
    }

    AsyncFunction("syncMonitoring") { () -> [String: Any] in
      let r = TIMScheduler.sync(source: "app")
      return ["registered": r.registered, "stopped": r.stopped, "errors": r.errors, "warnings": r.warnings]
    }

    // MARK: Selections

    AsyncFunction("presentActivityPicker") { (initialSelectionId: String?, baseSelectionId: String?, promise: Promise) in
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("E_NO_VC", "No view controller to present the picker from")
        return
      }
      let initial = initialSelectionId.flatMap { TIMSelections.load($0) } ?? FamilyActivitySelection()
      let model = PickerModel(selection: initial)
      var finished = false
      let host = UIHostingController(rootView: ActivityPickerScreen(model: model))
      host.modalPresentationStyle = .pageSheet
      model.onFinish = { [weak host] confirmed in
        guard !finished else { return }
        finished = true
        host?.dismiss(animated: true)
        guard confirmed else {
          promise.resolve(nil)
          return
        }
        let id = UUID().uuidString.lowercased()
        TIMSelections.save(model.selection, id: id)
        var result = Self.summary(model.selection)
        result["selectionId"] = id
        if let baseId = baseSelectionId, let base = TIMSelections.load(baseId) {
          result["relation"] = TIMSelections.relation(new: model.selection, base: base).rawValue
        } else {
          result["relation"] = NSNull()
        }
        promise.resolve(result)
      }
      host.presentationController?.delegate = model
      presenter.present(host, animated: true)
    }.runOnQueue(.main)

    Function("getSelectionSummary") { (id: String) -> [String: Any]? in
      guard let sel = TIMSelections.load(id) else { return nil }
      return Self.summary(sel)
    }

    Function("compareSelections") { (newId: String, baseId: String) -> String? in
      guard let a = TIMSelections.load(newId), let b = TIMSelections.load(baseId) else { return nil }
      return TIMSelections.relation(new: a, base: b).rawValue
    }

    Function("garbageCollectSelections") { (keepIds: [String]) -> Int in
      let keep = Set(keepIds)
      var removed = 0
      for id in TIMSelections.allIds() where !keep.contains(id) {
        TIMSelections.delete(id)
        removed += 1
      }
      return removed
    }

    // MARK: State for UI

    Function("getShieldRecords") { () -> [[String: Any]] in
      return TIMStore.shared.loadShieldRecords().values.map {
        ["ruleId": $0.ruleId, "dayKey": $0.dayKey, "limitMinutes": $0.limitMinutes,
         "appliedAt": $0.appliedAt.timeIntervalSince1970 * 1000]
      }
    }

    Function("getMonitorState") { () -> [String: Any] in
      let s = TIMStore.shared.loadMonitorState()
      var out: [String: Any] = [
        "warnings": s.warnings,
        "activities": s.records.values.map { r -> [String: Any] in
          var a: [String: Any] = ["activity": r.activity, "dayKey": r.dayKey]
          if let m = r.limitMinutes { a["limitMinutes"] = m }
          return a
        },
      ]
      if let at = s.lastSyncAt { out["lastSyncAt"] = at.timeIntervalSince1970 * 1000 }
      if let e = s.lastError { out["lastError"] = e }
      return out
    }

    Function("getDiagnosticsLog") { () -> [[String: Any]] in
      return TIMStore.shared.loadLog().suffix(100).map {
        ["at": $0.at.timeIntervalSince1970 * 1000, "source": $0.source, "message": $0.message]
      }
    }
  }

  static func statusString() -> String {
    let status = AuthorizationCenter.shared.authorizationStatus
    switch status {
    case .notDetermined: return "notDetermined"
    case .denied: return "denied"
    case .approved: return "approved"
    @unknown default:
      return String(describing: status).hasPrefix("approved") ? "approved" : "denied"
    }
  }

  static func summary(_ s: FamilyActivitySelection) -> [String: Any] {
    return [
      "applicationCount": s.applicationTokens.count,
      "categoryCount": s.categoryTokens.count,
      "webDomainCount": s.webDomainTokens.count,
    ]
  }
}

// MARK: - Picker UI

final class PickerModel: NSObject, ObservableObject, UIAdaptivePresentationControllerDelegate {
  @Published var selection: FamilyActivitySelection
  var onFinish: ((Bool) -> Void)?

  init(selection: FamilyActivitySelection) {
    self.selection = selection
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    onFinish?(false)  // swiped down = cancel
  }
}

struct ActivityPickerScreen: View {
  @ObservedObject var model: PickerModel

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $model.selection)
        .navigationTitle("制限するアプリ")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("キャンセル") { model.onFinish?(false) }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("完了") { model.onFinish?(true) }
              .disabled(TIMSelections.isEmpty(model.selection))
          }
        }
    }
    .navigationViewStyle(.stack)
  }
}
