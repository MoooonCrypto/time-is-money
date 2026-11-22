// App-facing Screen Time API.
//  - iOS dev client / release: the local Swift module (modules/screen-time).
//  - Development only, opt-in: EXPO_PUBLIC_TIM_MOCK=1 with __DEV__ uses an
//    in-memory mock so screens can be inspected without Screen Time (web, Jest).
//    The mock is never used in production builds.
//  - Otherwise (no native module): reports "unavailable"; nothing is faked.
import {
  NativeScreenTime,
  type AuthorizationStatus,
  type DiagnosticsEntry,
  type MonitorState,
  type PickedSelection,
  type ScreenTimeNativeModule,
  type SelectionRelation,
  type SelectionSummary,
  type ShieldRecord,
  type SyncResult,
} from "../../modules/screen-time";
import type { ScreenTimeStatus } from "../domain/permissions";

export interface ScreenTimeApi {
  readonly kind: "native" | "mock" | "unavailable";
  getStatus(): ScreenTimeStatus;
  requestAuthorization(): Promise<ScreenTimeStatus>;
  loadConfig(): string | null;
  saveConfig(json: string): void;
  syncMonitoring(): Promise<SyncResult>;
  pickApps(initialSelectionId: string | null, baseSelectionId: string | null): Promise<PickedSelection | null>;
  getSelectionSummary(id: string): SelectionSummary | null;
  garbageCollectSelections(keepIds: string[]): number;
  getShieldRecords(): ShieldRecord[];
  getMonitorState(): MonitorState;
  getDiagnosticsLog(): DiagnosticsEntry[];
}

function nativeApi(m: ScreenTimeNativeModule): ScreenTimeApi {
  return {
    kind: "native",
    getStatus: () => (m.isSupported() ? m.getAuthorizationStatus() : "unavailable"),
    requestAuthorization: async () => (await m.requestAuthorization()) as AuthorizationStatus,
    loadConfig: () => m.loadConfig(),
    saveConfig: (json) => m.saveConfig(json),
    syncMonitoring: () => m.syncMonitoring(),
    pickApps: (initial, base) => m.presentActivityPicker(initial, base),
    getSelectionSummary: (id) => m.getSelectionSummary(id),
    garbageCollectSelections: (keep) => m.garbageCollectSelections(keep),
    getShieldRecords: () => m.getShieldRecords(),
    getMonitorState: () => m.getMonitorState(),
    getDiagnosticsLog: () => m.getDiagnosticsLog(),
  };
}

const emptySync: SyncResult = { registered: [], stopped: [], errors: [], warnings: [] };

function unavailableApi(): ScreenTimeApi {
  let memoryConfig: string | null = null;
  return {
    kind: "unavailable",
    getStatus: () => "unavailable",
    requestAuthorization: async () => "unavailable",
    loadConfig: () => memoryConfig,
    saveConfig: (json) => {
      memoryConfig = json;
    },
    syncMonitoring: async () => ({ ...emptySync, errors: ["unavailable"] }),
    pickApps: async () => null,
    getSelectionSummary: () => null,
    garbageCollectSelections: () => 0,
    getShieldRecords: () => [],
    getMonitorState: () => ({ warnings: [], activities: [] }),
    getDiagnosticsLog: () => [],
  };
}

/** Development-only mock. Clearly labelled in the UI (see DevBanner). */
export function createMockApi(): ScreenTimeApi {
  let status: ScreenTimeStatus = "notDetermined";
  let config: string | null = null;
  let n = 0;
  const selections = new Map<string, SelectionSummary>();
  return {
    kind: "mock",
    getStatus: () => status,
    requestAuthorization: async () => {
      status = "approved";
      return status;
    },
    loadConfig: () => config,
    saveConfig: (json) => {
      config = json;
    },
    syncMonitoring: async () => emptySync,
    pickApps: async (_initial, base) => {
      const id = `mock-sel-${++n}`;
      const summary = { applicationCount: 2, categoryCount: 0, webDomainCount: 0 };
      selections.set(id, summary);
      const relation: SelectionRelation | null = base ? "other" : null;
      return { ...summary, selectionId: id, relation };
    },
    getSelectionSummary: (id) => selections.get(id) ?? { applicationCount: 1, categoryCount: 0, webDomainCount: 0 },
    garbageCollectSelections: () => 0,
    getShieldRecords: () => [],
    getMonitorState: () => ({ warnings: [], activities: [] }),
    getDiagnosticsLog: () => [],
  };
}

export function isMockRequested(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__ && process.env.EXPO_PUBLIC_TIM_MOCK === "1";
}

export const screenTime: ScreenTimeApi = NativeScreenTime
  ? nativeApi(NativeScreenTime)
  : isMockRequested()
    ? createMockApi()
    : unavailableApi();
