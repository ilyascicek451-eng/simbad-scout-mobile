# SİMBAD SCOUT — Android app

Build repository for the SİMBAD SCOUT Android app (Expo / React Native). The app is a client of the SİMBAD SCOUT
server; it contains no secrets. Development happens in the private main repository; this copy exists so the
signed Play release can be built on GitHub's hosted runners.

This repository and its mobile source code, build logs and artifacts are public. Do not copy private backend
code, customer records, credentials, keystores or personal test data here. The API address built into the app
is public configuration, never an authentication secret. The copyright notice below does not make files private.

Before signing, the workflow verifies the allow-listed public source snapshot, runs TypeScript checking and
mobile unit tests. A failed check stops the build before the signing key is restored. Existing release
inspection still checks the bundle and APK signature. Mobile checks do not prove backend or real-device behavior.

`ci/build-inputs.json` identifies the reviewed public mobile files. Update it only after checking an intentional
source synchronization. The private source-commit mapping stays in the private repository; it is not copied
into public logs or artifacts. The release artifact includes `build-provenance.json` with the public commit,
run identity and input-manifest digest. This is traceability, not an independent signed attestation.

This change does not start a build. The workflow runs on pushes to main or manual dispatch; changes on another
branch must be reviewed before merging. No private-repository token is required for this build.

© SİMBAD SCOUT. All rights reserved. No licence is granted to copy, modify or redistribute this code.

