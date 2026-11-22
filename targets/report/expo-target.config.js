// DeviceActivityReport extension (ExtensionKit).
// "device-activity-report" is added to @bacons/apple-targets by
// patches/@bacons+apple-targets+5.0.0.patch (applied on `npm install`).
const { appGroup } = require("../../config/ids");

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "device-activity-report",
  name: "TimeIsMoneyReport",
  bundleIdentifier: ".report",
  deploymentTarget: "16.4",
  frameworks: ["DeviceActivity", "SwiftUI", "Charts", "ManagedSettings", "FamilyControls"],
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups": [appGroup(config.ios.bundleIdentifier)],
  },
});
