// Single source of truth for identifiers used by app.config.ts and targets/*.
// Override per developer with environment variables (e.g. in .env.local, which is gitignored):
//   TIM_BUNDLE_ID=com.yourname.timeismoney
//   APPLE_TEAM_ID=XXXXXXXXXX
// Never commit a Team ID, certificates or provisioning profiles.

const DEFAULT_BUNDLE_ID = "com.example.timeismoney";

function bundleId() {
  return process.env.TIM_BUNDLE_ID || DEFAULT_BUNDLE_ID;
}

/** App Group shared by the app and every extension: "group.<main bundle id>". */
function appGroup(mainBundleId) {
  return `group.${mainBundleId || bundleId()}`;
}

module.exports = { DEFAULT_BUNDLE_ID, bundleId, appGroup };
