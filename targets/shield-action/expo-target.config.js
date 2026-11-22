// Shield Action extension (ManagedSettings).
const { appGroup } = require("../../config/ids");

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "shield-action",
  name: "TimeIsMoneyShieldAction",
  bundleIdentifier: ".shieldaction",
  deploymentTarget: "16.4",
  frameworks: ["ManagedSettings", "FamilyControls", "DeviceActivity"],
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups": [appGroup(config.ios.bundleIdentifier)],
  },
});
