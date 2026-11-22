// TIMShieldController.swift
// Applies / removes Shields with one named ManagedSettingsStore per rule,
// so each app limit is independent (X reaching its limit never locks YouTube).

import FamilyControls
import Foundation
import ManagedSettings

public enum TIMShieldController {
  static func storeName(ruleId: String) -> ManagedSettingsStore.Name {
    return ManagedSettingsStore.Name("tim.rule.\(ruleId)")
  }

  public static func apply(ruleId: String, selection: FamilyActivitySelection) {
    let store = ManagedSettingsStore(named: storeName(ruleId: ruleId))
    store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
    store.shield.applicationCategories = selection.categoryTokens.isEmpty
      ? nil : .specific(selection.categoryTokens, except: Set())
    store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
    store.shield.webDomainCategories = selection.categoryTokens.isEmpty
      ? nil : .specific(selection.categoryTokens, except: Set())
  }

  public static func clear(ruleId: String) {
    ManagedSettingsStore(named: storeName(ruleId: ruleId)).clearAllSettings()
  }

  /// Shields a rule for today after its threshold event, guarding against
  /// races with "bulk unlock" written concurrently by the app.
  /// Returns true when a shield remains applied.
  @discardableResult
  public static func shieldForThreshold(ruleId: String, generation: Int, now: Date = Date(),
                                        store: TIMStore = .shared) -> Bool {
    let cal = TIMCore.calendar()
    let config = store.loadConfig()
    guard !config.bulkUnlock.active, config.bulkUnlock.generation == generation else {
      store.log("shield", "ignored rule=\(ruleId): bulk unlock active or stale generation \(generation)")
      return false
    }
    guard let rule = config.rules.first(where: { $0.id == ruleId }),
      let today = TIMCore.todaysLimit(rule, now: now, calendar: cal),
      let selectionId = today.version.selectionId
    else {
      store.log("shield", "ignored rule=\(ruleId): no limit today")
      return false
    }
    // The registered monitor must be for today; otherwise it is a late event.
    let dayKey = TIMCore.dayKey(now, calendar: cal)
    let monitor = store.loadMonitorState().records[TIMCore.ruleActivityName(ruleId: ruleId, generation: generation)]
    if let monitor = monitor, monitor.dayKey != dayKey {
      store.log("shield", "ignored rule=\(ruleId): monitor registered for \(monitor.dayKey)")
      return false
    }
    let registeredLimit = monitor?.limitMinutes ?? today.minutes
    guard TIMCore.isPlausibleForToday(thresholdMinutes: min(registeredLimit, today.minutes), now: now, calendar: cal) else {
      store.log("shield", "ignored rule=\(ruleId): implausible for today (late event)")
      return false
    }
    // If the limit was raised for today (should only happen via next-day change),
    // the registered (lower) threshold is stale: do not shield.
    if registeredLimit < today.minutes {
      store.log("shield", "ignored rule=\(ruleId): registered \(registeredLimit) < today \(today.minutes)")
      return false
    }
    guard let selection = TIMSelections.load(selectionId, store: store), !TIMSelections.isEmpty(selection) else {
      store.log("shield", "ignored rule=\(ruleId): selection missing")
      return false
    }

    apply(ruleId: ruleId, selection: selection)
    var records = store.loadShieldRecords()
    records[ruleId] = TIMShieldRecord(ruleId: ruleId, dayKey: dayKey, limitMinutes: today.minutes,
                                      generation: generation, selectionId: selectionId, appliedAt: now)
    store.saveShieldRecords(records)

    // Re-check: the app may have bulk-unlocked while we were applying.
    let after = store.loadConfig()
    if after.bulkUnlock.active || after.bulkUnlock.generation != generation {
      clear(ruleId: ruleId)
      var r = store.loadShieldRecords()
      r.removeValue(forKey: ruleId)
      store.saveShieldRecords(r)
      store.log("shield", "rolled back rule=\(ruleId): bulk unlock raced")
      return false
    }
    store.log("shield", "applied rule=\(ruleId) limit=\(today.minutes)")
    return true
  }

  /// Removes shields that do not belong to today, belong to deleted rules,
  /// or exist while bulk unlock is active.
  public static func reconcile(config: TIMConfig, now: Date = Date(), store: TIMStore = .shared) {
    let dayKey = TIMCore.dayKey(now)
    var records = store.loadShieldRecords()
    var changed = false
    for (ruleId, record) in records {
      let ruleStillLimitedToday = config.rules.first(where: { $0.id == ruleId })
        .flatMap { TIMCore.todaysLimit($0, now: now) } != nil
      if config.bulkUnlock.active || record.dayKey != dayKey || !ruleStillLimitedToday
        || record.generation != config.bulkUnlock.generation
      {
        clear(ruleId: ruleId)
        records.removeValue(forKey: ruleId)
        changed = true
        store.log("shield", "cleared rule=\(ruleId) (day=\(record.dayKey), unlock=\(config.bulkUnlock.active))")
      }
    }
    if config.bulkUnlock.active {
      // Also clear stores for rules that never recorded a shield (belt and braces).
      for rule in config.rules { clear(ruleId: rule.id) }
    }
    if changed { store.saveShieldRecords(records) }
  }

  /// Finds the shield record whose selection contains the given token.
  public static func record(containing app: ApplicationToken?, category: ActivityCategoryToken?,
                            webDomain: WebDomainToken?, store: TIMStore = .shared) -> TIMShieldRecord? {
    let today = TIMCore.dayKey(Date())
    for record in store.loadShieldRecords().values where record.dayKey == today {
      guard let sel = TIMSelections.load(record.selectionId, store: store) else { continue }
      if let app = app, sel.applicationTokens.contains(app) { return record }
      if let category = category, sel.categoryTokens.contains(category) { return record }
      if let webDomain = webDomain, sel.webDomainTokens.contains(webDomain) { return record }
    }
    return nil
  }
}
