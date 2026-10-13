# Development frontend static asset continuity

An open editor can request an older lazy JavaScript chunk after the frontend
container has been replaced. The new image serves its own public files first,
then tries an optional previous-assets directory for a missing public static
file. It returns 404 when neither contains the file. It never returns SPA HTML
for a missing static asset.

The fallback directory is fixed at `/opt/identity-previous-web-assets`. Mount a
reviewed named volume there **read-only** on the development frontend service.
Without that volume, current files work normally and missing older files return
404. The application does not copy files into the volume or mutate browser
storage. Preserve all existing service settings when adding the mount.

```yaml
services:
  frontend-d:
    # Preserve the reviewed image, environment, routes and other mounts.
    volumes:
      - type: volume
        source: identity_previous_web_assets
        target: /opt/identity-previous-web-assets
        read_only: true
volumes:
  identity_previous_web_assets:
    external: true
    name: xrugc_dev_web_assets_REVIEWED_MANIFEST_SUFFIX
```

The superproject's `driver/identity-dev-web-assets-seed.py` prepares the directory
using Python's standard library. It performs no Docker, network, deployment or
credential operations. Provide the actual previous public docroot and a new
empty target directory with public read/traverse permissions. An optional older
retained tree must have a complete matching `.identity-web-assets-manifest.json`.

```sh
python3 driver/identity-dev-web-assets-seed.py --source=/old-public-html --target=/new-empty-assets
# Review the count, byte budget and exact plan_sha256, then apply that hash:
python3 driver/identity-dev-web-assets-seed.py --source=/old-public-html --target=/new-empty-assets --apply-plan-sha256=REVIEWED_FULL_SHA256
```

Add `--previous-retained=/old-retained-assets` to both commands to retain older
hash paths across another upgrade. Only mount the new target after successful
copy, manifest verification and HTTP review. The source can be an immutable
public tree read from a running container or its cold image; no account writer
drain is required. Changing a selected file during the copy stops the operation.
Failure may leave a partial target for inspection. The tool never overwrites,
removes partial files or retries in that directory.

The scope includes public JS, CSS, wasm, fonts, images, audio, video and model
files under `js/`, `css/`, `assets/`, `fonts/`, `img/`, `images/`, `local/`,
`resource/` and `media/`, plus root image/icon files. Only bounded ASCII paths
and an explicit static extension list are eligible. Files must already have
public read permission. Symlinks, hardlinked files and special files are rejected.
Two source trees with different bytes at the same path stop the seed; the tool
does not choose which version to keep.

HTML, runtime environment scripts, JSON/configuration, source maps, hidden
files, credentials, API/auth paths and the Unity tree are excluded. The seed
does not copy generated `.gz` siblings: ordinary JS/CSS URLs still use nginx gzip
negotiation over their retained original bytes. Missing `.gz`/`.map` URLs return
404. Unity releases, manifests, compressed files, CSP and service worker scope
continue to use their existing separate image retention and verification.

Existing cache durations remain one year for JS/CSS/fonts and 30 days for images.
Wasm now uses one year, and the added media types use 30 days. Retained files add
`nosniff`; HTML and runtime settings are
always taken from the new deployment. API/auth/config/documentation proxies have
priority over extension-based asset rules.

Run `node scripts/static-assets/container-smoke.mjs IMAGE` against the complete
candidate image. CI verifies new-file priority, old-file bytes/MIME/cache/ranges,
read-only mount, missing-file 404, rejected symlinks, excluded paths, proxy
priority and behavior without the optional volume. The existing Unity final
image smoke remains required. These checks do not establish authenticated
browser continuity: review the actual old asset manifest and then exercise an
already-open editor, two tabs, iframe and SSO with controlled development login
before the Identity authority switch. Keep previous volumes until their clients
and asset requests have been reviewed; cleanup is never automatic.
