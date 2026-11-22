// ShieldActionExtension.swift
// The Shield has exactly one button ("閉じる"). It closes the shielded app.
// There is deliberately no way to extend or unlock from the Shield.

import Foundation
import ManagedSettings

class ShieldActionExtension: ShieldActionDelegate {
  override func handle(action: ShieldAction, for application: ApplicationToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    cleanupIfStale()
    completionHandler(.close)
  }

  override func handle(action: ShieldAction, for webDomain: WebDomainToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    cleanupIfStale()
    completionHandler(.close)
  }

  override func handle(action: ShieldAction, for category: ActivityCategoryToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    cleanupIfStale()
    completionHandler(.close)
  }

  /// Safety net: if the midnight callback was missed, a shield from a previous
  /// day (or one left after bulk unlock) is removed so the next launch works.
  private func cleanupIfStale() {
    let store = TIMStore.shared
    TIMShieldController.reconcile(config: store.loadConfig(), store: store)
  }
}
