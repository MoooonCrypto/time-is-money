// TIMSelections.swift
// Opaque FamilyActivitySelection storage. Tokens never leave native code;
// TypeScript only sees selection ids and counts.

import FamilyControls
import Foundation

public enum TIMSelectionRelation: String {
  case same
  case superset  // new selection contains everything the base had (only tightens)
  case other     // something was removed (loosens)
}

public enum TIMSelections {
  static func key(_ id: String) -> String { TIMConstants.selectionKeyPrefix + id }

  public static func load(_ id: String, store: TIMStore = .shared) -> FamilyActivitySelection? {
    guard let data = store.defaults?.data(forKey: key(id)) else { return nil }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  public static func save(_ selection: FamilyActivitySelection, id: String, store: TIMStore = .shared) {
    guard let data = try? JSONEncoder().encode(selection) else { return }
    store.defaults?.set(data, forKey: key(id))
  }

  public static func delete(_ id: String, store: TIMStore = .shared) {
    store.defaults?.removeObject(forKey: key(id))
  }

  public static func allIds(store: TIMStore = .shared) -> [String] {
    guard let dict = store.defaults?.dictionaryRepresentation() else { return [] }
    return dict.keys.filter { $0.hasPrefix(TIMConstants.selectionKeyPrefix) }
      .map { String($0.dropFirst(TIMConstants.selectionKeyPrefix.count)) }
  }

  public static func isEmpty(_ s: FamilyActivitySelection) -> Bool {
    return s.applicationTokens.isEmpty && s.categoryTokens.isEmpty && s.webDomainTokens.isEmpty
  }

  public static func relation(new: FamilyActivitySelection, base: FamilyActivitySelection) -> TIMSelectionRelation {
    let sameApps = new.applicationTokens == base.applicationTokens
    let sameCats = new.categoryTokens == base.categoryTokens
    let sameWeb = new.webDomainTokens == base.webDomainTokens
    if sameApps && sameCats && sameWeb { return .same }
    if new.applicationTokens.isSuperset(of: base.applicationTokens)
      && new.categoryTokens.isSuperset(of: base.categoryTokens)
      && new.webDomainTokens.isSuperset(of: base.webDomainTokens)
    {
      return .superset
    }
    return .other
  }
}
