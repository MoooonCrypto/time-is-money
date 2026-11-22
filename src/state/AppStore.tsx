// App-wide state: settings (persisted in the App Group via the native module),
// permission statuses (re-checked whenever the app returns to the foreground),
// and native limit state for "現在の制限".
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import type { MonitorState, ShieldRecord, SyncResult } from "../../modules/screen-time";
import { type AppConfig, parseConfig, serializeConfig } from "../domain/config";
import type { NotificationStatus, ScreenTimeStatus } from "../domain/permissions";
import { compactConfig, referencedSelectionIds } from "../domain/rules";
import { getNotificationStatus, requestNotificationPermission } from "../native/notifications";
import { screenTime } from "../native/screenTime";

export interface AppStore {
  loaded: boolean;
  config: AppConfig;
  screenTimeStatus: ScreenTimeStatus;
  screenTimeRequestedThisSession: boolean;
  notificationStatus: NotificationStatus;
  shieldRecords: ShieldRecord[];
  monitorState: MonitorState;
  lastSync: SyncResult | null;
  /** Bumped on foreground so embedded reports re-query iOS. */
  refreshToken: number;
  updateConfig(fn: (c: AppConfig) => AppConfig): Promise<AppConfig>;
  refresh(): Promise<void>;
  requestScreenTime(): Promise<ScreenTimeStatus>;
  requestNotifications(): Promise<NotificationStatus>;
}

const Ctx = createContext<AppStore | null>(null);

const allowDebug = typeof __DEV__ !== "undefined" && __DEV__;

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  // The App Group read is synchronous, so the saved config is available on first render.
  const [config, setConfig] = useState<AppConfig>(() =>
    compactConfig(parseConfig(screenTime.loadConfig()), new Date()),
  );
  const configRef = useRef(config);
  const loaded = true;
  const [screenTimeStatus, setScreenTimeStatus] = useState<ScreenTimeStatus>(() => screenTime.getStatus());
  const [requested, setRequested] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>("undetermined");
  const [shieldRecords, setShieldRecords] = useState<ShieldRecord[]>([]);
  const [monitorState, setMonitorState] = useState<MonitorState>({ warnings: [], activities: [] });
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const persist = useCallback((next: AppConfig) => {
    configRef.current = next;
    setConfig(next);
    screenTime.saveConfig(serializeConfig(next, { allowDebug }));
  }, []);

  const readNativeState = useCallback(() => {
    setShieldRecords(screenTime.getShieldRecords());
    setMonitorState(screenTime.getMonitorState());
  }, []);

  const sync = useCallback(async () => {
    try {
      const r = await screenTime.syncMonitoring();
      setLastSync(r);
    } catch (e) {
      setLastSync({ registered: [], stopped: [], errors: [String(e)], warnings: [] });
    }
    readNativeState();
  }, [readNativeState]);

  const refresh = useCallback(async () => {
    const notification = await getNotificationStatus();
    setScreenTimeStatus(screenTime.getStatus());
    setNotificationStatus(notification);
    // New day? Drop history that no longer applies (pending changes become current).
    const compacted = compactConfig(configRef.current, new Date());
    if (JSON.stringify(compacted) !== JSON.stringify(configRef.current)) persist(compacted);
    await sync();
    setRefreshToken((t) => t + 1);
  }, [persist, sync]);

  // Initial load: write back the compacted config, drop unreferenced selections, sync monitors.
  useEffect(() => {
    const initial = configRef.current;
    screenTime.saveConfig(serializeConfig(initial, { allowDebug }));
    screenTime.garbageCollectSelections(referencedSelectionIds(initial));
    // Asynchronous refresh (permissions, native state); state updates happen after awaits.
    void Promise.resolve().then(refresh);
  }, [refresh]);

  // Re-check permissions and day rollover whenever the app becomes active
  // (e.g. returning from the Settings app).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const updateConfig = useCallback(
    async (fn: (c: AppConfig) => AppConfig) => {
      const next = compactConfig(fn(configRef.current), new Date());
      persist(next);
      await sync();
      return next;
    },
    [persist, sync],
  );

  const requestScreenTime = useCallback(async () => {
    setRequested(true);
    const s = await screenTime.requestAuthorization();
    setScreenTimeStatus(s);
    await sync();
    return s;
  }, [sync]);

  const requestNotifications = useCallback(async () => {
    const s = await requestNotificationPermission();
    setNotificationStatus(s);
    return s;
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      loaded,
      config,
      screenTimeStatus,
      screenTimeRequestedThisSession: requested,
      notificationStatus,
      shieldRecords,
      monitorState,
      lastSync,
      refreshToken,
      updateConfig,
      refresh,
      requestScreenTime,
      requestNotifications,
    }),
    [
      loaded,
      config,
      screenTimeStatus,
      requested,
      notificationStatus,
      shieldRecords,
      monitorState,
      lastSync,
      refreshToken,
      updateConfig,
      refresh,
      requestScreenTime,
      requestNotifications,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): AppStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppStore must be used inside AppStoreProvider");
  return v;
}
