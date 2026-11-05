import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// The plugin is CommonJS (Expo loads it with require); load only the pure transform here.
const require = createRequire(import.meta.url);
let addReleaseSigning: (g: string) => string;
try {
  addReleaseSigning = require("../plugins/withReleaseSigning.js").addReleaseSigning;
} catch {
  // expo/config-plugins is unavailable outside an installed project; test the transform via a shim.
  const Module = require("node:module");
  const original = Module._load;
  Module._load = (name: string, ...rest: unknown[]) => name === "expo/config-plugins" ? { withAppBuildGradle: () => null } : original(name, ...rest);
  addReleaseSigning = require("../plugins/withReleaseSigning.js").addReleaseSigning;
  Module._load = original;
}

const TEMPLATE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

test("release uses the upload key when provided, debug build type untouched", () => {
  const out = addReleaseSigning(TEMPLATE);
  assert.match(out, /release \{\n\s+if \(System\.getenv\("SIMBAD_UPLOAD_STORE_FILE"\)\)/);
  assert.match(out, /signingConfig\(System\.getenv\("SIMBAD_UPLOAD_STORE_FILE"\) \? signingConfigs\.release : signingConfigs\.debug\)/);
  assert.match(out, /debug \{\n\s+signingConfig signingConfigs\.debug\n/);
  assert.equal(addReleaseSigning(out), out); // idempotent
  assert.ok(!/password\s+'(?!android)/i.test(out), "no secret literals");
});

test("unknown layout fails loudly instead of silently shipping debug signing", () => {
  assert.throws(() => addReleaseSigning("android { }"));
});
