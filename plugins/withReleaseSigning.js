// Expo config plugin: sign release builds with the Google Play *upload key* when CI provides it.
// The keystore and passwords come only from environment variables (GitHub encrypted secrets);
// nothing secret is stored in the repository. Without them, release falls back to the debug key.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "SIMBAD_UPLOAD_STORE_FILE";

function addReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;
  const withConfig = gradle.replace(/signingConfigs\s*\{/, `signingConfigs {
        release {
            if (System.getenv("${MARKER}")) {
                storeFile file(System.getenv("${MARKER}"))
                storePassword System.getenv("SIMBAD_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("SIMBAD_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("SIMBAD_UPLOAD_KEY_PASSWORD")
            }
        }`);
  // Only the buildTypes.release block: [^}]*? cannot cross the closing brace of other blocks.
  const result = withConfig.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[^}]*?)signingConfig signingConfigs\.debug/,
    `$1signingConfig(System.getenv("${MARKER}") ? signingConfigs.release : signingConfigs.debug)`);
  if (result === gradle || !result.includes(`? signingConfigs.release`)) {
    throw new Error("withReleaseSigning: android/app/build.gradle layout not recognised; release signing not applied");
  }
  return result;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, cfg => {
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.addReleaseSigning = addReleaseSigning;
