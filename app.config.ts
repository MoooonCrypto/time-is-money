// Expo app config — the source of truth for the generated ios/ project
// (Continuous Native Generation: ios/ is gitignored and rebuilt with
// `npx expo prebuild --clean -p ios`). Extension targets live in targets/*.
import type { ConfigContext, ExpoConfig } from "expo/config";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ids = require("./config/ids") as { bundleId(): string; appGroup(id?: string): string };

export default ({ config }: ConfigContext): ExpoConfig => {
  const bundleIdentifier = ids.bundleId();
  return {
    ...config,
    name: "Time Is Money",
    slug: "time-is-money",
    scheme: "timeismoney",
    version: "1.0.0",
    platforms: ["ios"],
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      bundleIdentifier,
      supportsTablet: false,
      // Development Team: set APPLE_TEAM_ID in .env.local (never commit it).
      ...(process.env.APPLE_TEAM_ID ? { appleTeamId: process.env.APPLE_TEAM_ID } : {}),
      entitlements: {
        "com.apple.developer.family-controls": true,
        "com.apple.security.application-groups": [ids.appGroup(bundleIdentifier)],
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins: [
      "expo-router",
      // Local notifications only (posted by the DeviceActivityMonitor extension):
      // do not add the APNs entitlement.
      ["expo-notifications", { enableRemoteNotifications: false }],
      "@bacons/apple-targets",
    ],
    experiments: {
      typedRoutes: false,
    },
  };
};
