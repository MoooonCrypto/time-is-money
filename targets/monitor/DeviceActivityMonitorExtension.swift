// DeviceActivityMonitorExtension.swift
// Runs without the app being open.
//  - intervalDidStart: new day (or re-registration) -> clear yesterday's shields,
//    register today's per-rule thresholds (weekday rules, pending changes).
//  - eventDidReachThreshold on tim.rule.*: shield that rule's apps for the rest of today.
//  - eventDidReachThreshold on tim.total: cumulative-usage yen notification (once per day/threshold).

import DeviceActivity
import Foundation
import ManagedSettings
import UserNotifications

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  let store = TIMStore.shared

  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    store.log("monitor", "intervalDidStart \(activity.rawValue)")
    TIMScheduler.sync(source: "intervalDidStart")
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    // Intentionally no shield changes here: stopMonitoring() during a re-sync
    // also calls intervalDidEnd, and today's shields must survive that.
    store.log("monitor", "intervalDidEnd \(activity.rawValue)")
  }

  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    let now = Date()
    store.log("monitor", "threshold \(activity.rawValue)/\(event.rawValue)")

    if activity.rawValue == TIMConstants.totalActivityName {
      handleUsageThreshold(event: event.rawValue, now: now)
      return
    }
    if let parsed = TIMCore.parseRuleActivity(activity.rawValue),
      event.rawValue == TIMConstants.ruleLimitEventName
    {
      // Make sure today's registration is in place (missed midnight callback),
      // then decide whether this event really belongs to today.
      TIMScheduler.sync(now: now, source: "ruleEvent")
      TIMShieldController.shieldForThreshold(ruleId: parsed.ruleId, generation: parsed.generation, now: now)
    }
  }

  private func handleUsageThreshold(event: String, now: Date) {
    guard let hours = TIMCore.parseUsageEvent(event) else { return }
    let config = store.loadConfig()
    #if DEBUG
      let thresholdMinutes = config.debugShortThresholds == true ? hours : hours * 60
    #else
      let thresholdMinutes = hours * 60
    #endif
    let cal = TIMCore.calendar()
    guard TIMCore.isPlausibleForToday(thresholdMinutes: thresholdMinutes, now: now, calendar: cal) else {
      store.log("usage", "ignored late event h\(hours)")
      return
    }
    let dayKey = TIMCore.dayKey(now, calendar: cal)
    let marked = TIMCore.markNotified(store.loadNotified(), dayKey: dayKey, hours: hours)
    guard marked.isNew else {
      store.log("usage", "duplicate h\(hours) on \(dayKey)")
      return
    }
    store.saveNotified(marked.map)
    #if DEBUG
      let devPrefix = config.debugShortThresholds == true ? "[DEV 短縮: 実際は\(hours)分] " : ""
    #else
      let devPrefix = ""
    #endif
    postNotification(hours: hours, rate: config.hourlyRateYen, dayKey: dayKey, prefix: devPrefix)
  }

  private func postNotification(hours: Int, rate: Int?, dayKey: String, prefix: String) {
    let center = UNUserNotificationCenter.current()
    let done = DispatchSemaphore(value: 0)
    center.getNotificationSettings { settings in
      guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
        || settings.authorizationStatus == .ephemeral
      else {
        self.store.log("usage", "notification not authorized; skipped h\(hours)")
        done.signal()
        return
      }
      let content = UNMutableNotificationContent()
      content.title = "Time Is Money"
      content.body = prefix + TIMCore.usageNotificationBody(rate: rate, hours: hours)
      content.sound = .default
      content.threadIdentifier = "tim.usage"
      // expo-notifications exposes userInfo["body"] as `data` in JS.
      content.userInfo = [
        "url": TIMConstants.statsDeepLink,
        "body": ["url": TIMConstants.statsDeepLink, "type": "usageThreshold", "hours": hours],
      ]
      let request = UNNotificationRequest(
        identifier: TIMCore.usageNotificationIdentifier(dayKey: dayKey, hours: hours),
        content: content, trigger: nil)
      center.add(request) { error in
        self.store.log("usage", "notified h\(hours) error=\(String(describing: error))")
        done.signal()
      }
    }
    _ = done.wait(timeout: .now() + 5)
  }
}
