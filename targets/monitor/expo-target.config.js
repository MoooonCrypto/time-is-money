// DeviceActivityMonitor extension. Source of truth for this target's Xcode settings.
// Regenerate the native project with `npx expo prebuild --clean -p ios`.
const { appGroup } = require("../../config/ids");

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "device-activity-monitor",
  name: "TimeIsMoneyMonitor",
  bundleIdentifier: ".monitor",
  deploymentTarget: "16.4",
  frameworks: ["DeviceActivity", "ManagedSettings", "FamilyControls", "UserNotifications"],
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups": [appGroup(config.ios.bundleIdentifier)],
  },
});
