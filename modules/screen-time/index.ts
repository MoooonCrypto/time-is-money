// Typed JS bridge for the local "screen-time" Expo module (Swift sources in ./ios).
// On platforms without the native module (Jest, web) the functions are undefined;
// use src/native/screenTime.ts which adds an explicit, dev-only mock.
import { requireOptionalNativeModule, requireNativeView } from "expo";
import type { ComponentType } from "react";
import type { ViewProps } from "react-native";

export type AuthorizationStatus = "notDetermined" | "denied" | "approved";

export type SelectionRelation = "same" | "superset" | "other";

export interface SelectionSummary {
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
}

export interface PickedSelection extends SelectionSummary {
  selectionId: string;
  /** Relation to the base selection, null when there is no base. */
  relation: SelectionRelation | null;
}

export interface SyncResult {
  registered: string[];
  stopped: string[];
  errors: string[];
  warnings: string[];
}

export interface ShieldRecord {
  ruleId: string;
  dayKey: string;
  limitMinutes: number;
  appliedAt: number;
}

export interface MonitorState {
  lastSyncAt?: number;
  lastError?: string;
  warnings: string[];
  activities: { activity: string; dayKey: string; limitMinutes?: number }[];
}

export interface DiagnosticsEntry {
  at: number;
  source: string;
  message: string;
}

export interface ScreenTimeNativeModule {
  isSupported(): boolean;
  getAppGroupInfo(): { appGroup: string; available: boolean };
  /** Synchronous; avoid on the JS thread (XPC to FamilyControlsAgent can stall). */
  getAuthorizationStatus(): AuthorizationStatus;
  getAuthorizationStatusAsync(): Promise<AuthorizationStatus>;
  requestAuthorization(): Promise<AuthorizationStatus>;
  loadConfig(): string | null;
  saveConfig(json: string): void;
  syncMonitoring(): Promise<SyncResult>;
  presentActivityPicker(
    initialSelectionId: string | null,
    baseSelectionId: string | null,
  ): Promise<PickedSelection | null>;
  getSelectionSummary(id: string): SelectionSummary | null;
  compareSelections(newId: string, baseId: string): SelectionRelation | null;
  garbageCollectSelections(keepIds: string[]): number;
  getShieldRecords(): ShieldRecord[];
  getMonitorState(): MonitorState;
  getDiagnosticsLog(): DiagnosticsEntry[];
}

export const NativeScreenTime =
  requireOptionalNativeModule<ScreenTimeNativeModule>("TIMScreenTime");

export type UsageRange = "today" | "week" | "total";

export interface UsageReportViewProps extends ViewProps {
  range: UsageRange;
  refreshToken?: number;
}

export interface SelectionLabelViewProps extends ViewProps {
  selectionId: string | null;
  maxIcons?: number;
  showTitles?: boolean;
}

function optionalView<P extends object>(name: string): ComponentType<P> | null {
  if (!NativeScreenTime) return null;
  try {
    return requireNativeView<P>(name);
  } catch {
    return null;
  }
}

export const NativeUsageReportView = optionalView<UsageReportViewProps>("TIMUsageReport");
export const NativeSelectionLabelView = optionalView<SelectionLabelViewProps>("TIMSelectionLabel");
