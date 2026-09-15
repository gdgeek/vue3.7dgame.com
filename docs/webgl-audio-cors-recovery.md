# WebGL audio CORS recovery (2026-09-15)

Scene 2325 failed in `loading_scene` after Unity initialized. Release
`a641843ad22c58db121cde69` reported `SCENE_RESOURCE_FETCH_FAILED` for
`https://data.7dgame.com/audio/d03660c8c37eff4ffc5983d6ee4dc8df.wav`.

GET with `Origin: https://d.xrugc.com` returned 200 / CDN HIT without
`Access-Control-Allow-Origin`. A fresh query returned 200 / MISS with `*`.
The corresponding object on
`7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com` returned `*`, the same
ETag and CRC64, and 860762 bytes. A browser CORS fetch of that COS object
succeeded. CDN results differed between browser and command-line probes;
one successful request is not proof that all cached variants are repaired.

## Frontend mitigation

`unityPreviewPayload.ts` now retains the legacy public COS host instead of
forcing resources through the CDN. It also maps unsigned CDN
`/audio/<32 lowercase hex characters>.wav` URLs to that same COS bucket.
Other CDN paths and every query-bearing CDN URL remain unchanged. Existing
HTTPS COS URLs remain unchanged; legacy HTTP COS URLs are upgraded to HTTPS.
The origin allowlist and rejection of credentials remain in force.

This operates on the cloned preview payload, not saved scene data. It covers
nested JSON and historical proxy URLs. It does not introduce a server proxy,
disable CORS, add random query parameters, or change private resource access.
Direct COS requests still require valid CORS headers. This mitigation can
increase COS traffic and does not repair other CDN resources.

## Permanent CDN repair and acceptance

1. Inspect the existing EdgeOne/CDN response-header and cache-variant rules
   for `data.7dgame.com`, including the COS origin CORS policy.
2. Ensure the intended CORS headers reach clients on both HIT and MISS.
   Use `*` only for resources already intended for public, credential-free
   reads; retain the existing restrictions for private resources.
3. Purge affected old resource caches after correcting the policy.
4. Test original URLs with GET and Range from the actual page origin, across
   relevant CDN locations. Do not rely on cache-busting queries for acceptance.
5. Deploy the frontend mitigation through the normal frontend release process
   if CDN repair is not yet available. Run scene 2325 through loading,
   interaction, audio playback and exit. Deployment and full scene acceptance
   have not been performed as part of this local patch.
6. If `MethodAccessException` for `System.IDisposable.Dispose` persists after
   resource reads succeed, investigate the Unity build separately.

After stable CDN acceptance, the temporary hash-named WAV mapping can be
removed. Retaining original COS URLs avoids changing hosts on signed URLs.
