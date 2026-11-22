// TIMStore.swift
// App Group backed storage shared by the app and its extensions.
//
// App Group identifier convention: "group.<main app bundle identifier>".
// Extensions use "<main bundle id>.<suffix>" bundle identifiers, so the main
// bundle id is derived by dropping the last component when running inside an
// .appex. See README "Bundle ID / App Group".

import Foundation

public final class TIMStore {
  public static let shared = TIMStore()

  public let appGroupIdentifier: String
  public let defaults: UserDefaults?

  public init(appGroupIdentifier: String? = nil) {
    let group = appGroupIdentifier ?? TIMStore.deriveAppGroupIdentifier()
    self.appGroupIdentifier = group
    self.defaults = UserDefaults(suiteName: group)
  }

  public static func deriveAppGroupIdentifier(bundle: Bundle = .main) -> String {
    if let explicit = bundle.object(forInfoDictionaryKey: "TIMAppGroupIdentifier") as? String,
      !explicit.isEmpty, !explicit.contains("$(")
    {
      return explicit
    }
    var id = bundle.bundleIdentifier ?? "com.example.timeismoney"
    if bundle.bundlePath.hasSuffix(".appex"), let dot = id.range(of: ".", options: .backwards) {
      id = String(id[id.startIndex..<dot.lowerBound])
    }
    return "group.\(id)"
  }

  public var isAvailable: Bool { defaults != nil }

  // MARK: Config (JS writes, native reads)

  public func loadConfigJSON() -> String? {
    return defaults?.string(forKey: TIMConstants.configKey)
  }

  public func saveConfigJSON(_ json: String) {
    defaults?.set(json, forKey: TIMConstants.configKey)
  }

  public func loadConfig() -> TIMConfig {
    guard let json = loadConfigJSON(), let data = json.data(using: .utf8),
      let config = TIMCore.decodeConfig(data)
    else { return .empty }
    return config
  }

  // MARK: Generic Codable helpers

  public func read<T: Decodable>(_ type: T.Type, key: String) -> T? {
    guard let data = defaults?.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(T.self, from: data)
  }

  public func write<T: Encodable>(_ value: T, key: String) {
    guard let data = try? JSONEncoder().encode(value) else { return }
    defaults?.set(data, forKey: key)
  }

  // MARK: Shield state

  public func loadShieldRecords() -> [String: TIMShieldRecord] {
    return read([String: TIMShieldRecord].self, key: TIMConstants.shieldStateKey) ?? [:]
  }

  public func saveShieldRecords(_ records: [String: TIMShieldRecord]) {
    write(records, key: TIMConstants.shieldStateKey)
  }

  // MARK: Monitor state

  public func loadMonitorState() -> TIMMonitorState {
    return read(TIMMonitorState.self, key: TIMConstants.monitorStateKey) ?? TIMMonitorState()
  }

  public func saveMonitorState(_ state: TIMMonitorState) {
    write(state, key: TIMConstants.monitorStateKey)
  }

  // MARK: Usage notification dedupe

  public func loadNotified() -> [String: [Int]] {
    return read([String: [Int]].self, key: TIMConstants.notifiedKey) ?? [:]
  }

  public func saveNotified(_ map: [String: [Int]]) {
    write(map, key: TIMConstants.notifiedKey)
  }

  // MARK: Diagnostics

  public struct LogEntry: Codable {
    public var at: Date
    public var source: String
    public var message: String
  }

  public func log(_ source: String, _ message: String) {
    var entries = read([LogEntry].self, key: TIMConstants.eventLogKey) ?? []
    entries.append(LogEntry(at: Date(), source: source, message: message))
    if entries.count > 200 { entries.removeFirst(entries.count - 200) }
    write(entries, key: TIMConstants.eventLogKey)
  }

  public func loadLog() -> [LogEntry] {
    return read([LogEntry].self, key: TIMConstants.eventLogKey) ?? []
  }
}
