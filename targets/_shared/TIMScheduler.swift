// TIMScheduler.swift
// Registers DeviceActivity monitors from the shared config.
// Called by the app (launch / foreground / config change) and by the
// DeviceActivityMonitor extension (interval start = new day, events), so the
// day rollover works while the app is closed.
//
// Monitors:
//   tim.total               00:00-23:59:59 daily, events h2..h24 (no apps/categories/domains = whole iPhone)
//   tim.rule.<id>.g<gen>    00:00-23:59:59 daily, event "limit" = today's limit for that rule
//
// Idempotent: a monitor is only re-registered when its signature changes, so
// calling sync() from intervalDidStart cannot loop.

import DeviceActivity
import FamilyControls
import Foundation

public struct TIMSyncResult {
  public var registered: [String] = []
  public var stopped: [String] = []
  public var errors: [String] = []
  public var warnings: [String] = []
}

public enum TIMScheduler {
  static let lock = NSLock()

  static var dailySchedule: DeviceActivitySchedule {
    DeviceActivitySchedule(
      intervalStart: DateComponents(hour: 0, minute: 0, second: 0),
      intervalEnd: DateComponents(hour: 23, minute: 59, second: 59),
      repeats: true)
  }

  static func makeEvent(selection: FamilyActivitySelection?, threshold: DateComponents) -> DeviceActivityEvent {
    let apps = selection?.applicationTokens ?? []
    let cats = selection?.categoryTokens ?? []
    let webs = selection?.webDomainTokens ?? []
    if #available(iOS 17.4, *) {
      // Count today's usage that happened before (re)registration, e.g. after
      // "resume" or a mid-day change. Documented: "Whether the system takes into
      // account the person's device activity before your app starts monitoring".
      return DeviceActivityEvent(applications: apps, categories: cats, webDomains: webs,
                                 threshold: threshold, includesPastActivity: true)
    }
    return DeviceActivityEvent(applications: apps, categories: cats, webDomains: webs, threshold: threshold)
  }

  static var useShortThresholds: Bool {
    #if DEBUG
      return TIMStore.shared.loadConfig().debugShortThresholds == true
    #else
      return false
    #endif
  }

  public static var isAuthorized: Bool {
    let status = AuthorizationCenter.shared.authorizationStatus
    if status == .approved { return true }
    // Newer SDKs add `.approvedWithDataAccess`; match by name to stay source compatible.
    return String(describing: status).hasPrefix("approved")
  }

  @discardableResult
  public static func sync(now: Date = Date(), source: String, store: TIMStore = .shared) -> TIMSyncResult {
    lock.lock()
    defer { lock.unlock() }
    var result = TIMSyncResult()
    let config = store.loadConfig()
    let cal = TIMCore.calendar()
    let dayKey = TIMCore.dayKey(now, calendar: cal)

    // 1. Shields first: clear yesterday's / unlocked / deleted.
    TIMShieldController.reconcile(config: config, now: now, store: store)

    guard isAuthorized else {
      result.errors.append("notAuthorized")
      var state = store.loadMonitorState()
      state.lastSyncAt = now
      state.lastError = "notAuthorized"
      store.saveMonitorState(state)
      return result
    }

    let center = DeviceActivityCenter()
    var state = store.loadMonitorState()
    var desired: [String: (signature: String, limit: Int?, register: () throws -> Void)] = [:]

    // 2. Whole-iPhone usage monitor (always on, even during bulk unlock).
    let short = useShortThresholds
    let totalSignature = "total;short=\(short);v2"
    desired[TIMConstants.totalActivityName] = (totalSignature, nil, {
      func events(includeTwentyFour: Bool) -> [DeviceActivityEvent.Name: DeviceActivityEvent] {
        var map: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
        for h in TIMConstants.usageThresholdHours {
          if h == 24 && !includeTwentyFour { continue }
          let threshold = short ? DateComponents(minute: h) : DateComponents(hour: h)
          map[DeviceActivityEvent.Name(TIMCore.usageEventName(hours: h))] = makeEvent(selection: nil, threshold: threshold)
        }
        return map
      }
      do {
        try center.startMonitoring(DeviceActivityName(TIMConstants.totalActivityName),
                                   during: dailySchedule, events: events(includeTwentyFour: true))
      } catch {
        // A 24h threshold equals the whole interval and may be rejected.
        result.warnings.append("total24hRejected: \(error)")
        try center.startMonitoring(DeviceActivityName(TIMConstants.totalActivityName),
                                   during: dailySchedule, events: events(includeTwentyFour: false))
      }
    })

    // 3. Per-rule monitors (skipped entirely during bulk unlock).
    if !config.bulkUnlock.active {
      for rule in config.rules.prefix(TIMConstants.maxRules) {
        guard let version = TIMCore.effectiveVersion(rule, dayKey: dayKey),
          let selectionId = version.selectionId,
          let selection = TIMSelections.load(selectionId, store: store),
          !TIMSelections.isEmpty(selection)
        else { continue }
        let limit = TIMCore.limitMinutes(version, weekday: TIMCore.weekdayIndex(now, calendar: cal))
        let name = TIMCore.ruleActivityName(ruleId: rule.id, generation: config.bulkUnlock.generation)
        let signature = TIMCore.ruleMonitorSignature(dayKey: dayKey, limitMinutes: limit,
                                                     generation: config.bulkUnlock.generation,
                                                     selectionId: selectionId)
        desired[name] = (signature, limit, {
          var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
          if let limit = limit {
            events[DeviceActivityEvent.Name(TIMConstants.ruleLimitEventName)] =
              makeEvent(selection: selection, threshold: DateComponents(minute: limit))
          }
          // "No limit today" still keeps a monitor so intervalDidStart fires tomorrow.
          try center.startMonitoring(DeviceActivityName(name), during: dailySchedule, events: events)
        })
      }
    }

    // 4. Stop monitors that are no longer desired (old generation, deleted rule, unlock).
    let active = Set(center.activities.map { $0.rawValue })
    let toStop = active.filter { $0.hasPrefix("tim.") && desired[$0] == nil }
    if !toStop.isEmpty {
      center.stopMonitoring(toStop.map { DeviceActivityName($0) })
      for n in toStop { state.records.removeValue(forKey: n) }
      result.stopped = Array(toStop)
    }
    for key in state.records.keys where desired[key] == nil { state.records.removeValue(forKey: key) }

    // 5. (Re)register changed monitors.
    for (name, entry) in desired {
      let current = state.records[name]
      let upToDate = current?.signature == entry.signature
        && (name == TIMConstants.totalActivityName || current?.dayKey == dayKey)
        && active.contains(name)
      if upToDate { continue }
      do {
        if active.contains(name) { center.stopMonitoring([DeviceActivityName(name)]) }
        try entry.register()
        state.records[name] = TIMMonitorRecord(activity: name, dayKey: dayKey,
                                               signature: entry.signature, limitMinutes: entry.limit)
        result.registered.append(name)
      } catch {
        result.errors.append("\(name): \(error)")
      }
    }

    state.lastSyncAt = now
    state.lastError = result.errors.first
    state.warnings = result.warnings
    store.saveMonitorState(state)
    if !result.registered.isEmpty || !result.stopped.isEmpty || !result.errors.isEmpty {
      store.log("sync/\(source)", "registered=\(result.registered) stopped=\(result.stopped) errors=\(result.errors)")
    }
    return result
  }
}
