# Built-in Unity artifact pipeline

Run these commands from the **main web repository** using Node 24 and pnpm 9.15.0:

```sh
corepack pnpm unity:acquire
corepack pnpm unity:test
corepack pnpm unity:verify
VITE_APP_PORT=3016 corepack pnpm dev
```

`unity:acquire` pulls the immutable image in `artifact-lock.json`, creates a temporary container **without starting it**, copies its four Unity files to `.unity-artifacts/Build`, removes the temporary container and verifies the files. It then assembles `.unity-runtime/webgl-preview`. These directories are ignored by Git and Docker. No neighboring plugin checkout is read by these commands or by CI. After editing the checked-in runner, use `corepack pnpm unity:prepare` to generate a new release; the development server never falls back to a plugin domain when files are missing.

The original `build-manifest.js` validation primitives are copied as `build-manifest.cjs` from `7dgame-com/webgl-preview` commit `f3fbe0dda98e6f9255339c0c880ff2015d021199`. The source and licensing record is in `runtime/unity/SOURCES.md`. `runtime.mjs` adds the main site's immutable artifact lock and release inventory. Artifact compatibility metadata describes the required protocol/build combination; it does **not** claim that browser or scene acceptance has passed.

## Images and version retention

```sh
# First built-in deployment: no previous main-site runtime exists.
docker build --platform linux/amd64 -t xrugc-main-unity:local .
corepack pnpm unity:smoke xrugc-main-unity:local

# Every subsequent upgrade: use the previously verified MAIN WEB image digest.
docker build --platform linux/amd64 \
  --build-arg UNITY_PREVIOUS_IMAGE=registry.example/main-web@sha256:REPLACE_WITH_VERIFIED_DIGEST \
  -t xrugc-main-unity:upgrade .
corepack pnpm unity:smoke xrugc-main-unity:upgrade
```

`UNITY_PREVIOUS_IMAGE` rejects floating tags. Its default is the previously verified main-site image pinned in the Dockerfiles. The current Unity source image contains artifacts only and must not be used as a previous main-site deployment. CI reads the optional repository variable of the same name; set it to the previously verified **main web** digest before later upgrades. A selected previous main image that lacks `active.json`, has corrupt files or contains inconsistent metadata fails the build.

The resulting image retains exactly its current release and the previous image's active release; it does not recursively inherit older retained releases. Both releases are fully verified. `/webgl-preview/retained-releases.json` records the previous image and retained identity. Previously opened iframes keep using their fixed release path; the new active pointer affects new sessions. Retention lasts until the next upgrade. Before a second subsequent upgrade removes that release, close its remaining sessions or wait for the operational session window to end. Local preparation keeps older local releases until explicitly removed during development.

The final image contains the complete frontend/runner/SW/manifest/Unity deployment unit. Roll back by restoring the previously verified main web image digest and its deployment configuration. Do not replace only the active pointer or use a remote-plugin fallback. The standalone plugin is retired; the main-site runner is the only maintained playback path. Historical remote service shutdown is tracked separately from source changes.

## What the gates prove

Docker verifies exact file inventory, sizes, SHA-256 hashes, gzip decoding, decoded-response hashes and the pinned Unity build combination before copying the final tree to nginx. The final-image smoke command copies the published static tree back out and independently verifies it, then checks four real Unity files over HTTP, their raw transfer hashes, MIME types, encodings, byte ranges, immutable cache headers, the uncacheable active pointer and true missing-file 404s. Runtime HTML has a resource-domain CSP that excludes the old plugin domain, and its service worker cannot claim a scope above its release directory.

CI loads and checks the exact image before pushing its tags. These artifact/HTTP checks do not replace the separate real-browser, native WebMCP, scene-behavior and headset acceptance records.
