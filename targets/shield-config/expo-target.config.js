// Shield Configuration extension (ManagedSettingsUI).
const { appGroup } = require("../../config/ids");

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "shield-config",
  name: "TimeIsMoneyShieldConfig",
  bundleIdentifier: ".shieldconfig",
  deploymentTarget: "16.4",
  frameworks: ["ManagedSettings", "ManagedSettingsUI", "FamilyControls", "DeviceActivity"],
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups": [appGroup(config.ios.bundleIdentifier)],
  },
});
