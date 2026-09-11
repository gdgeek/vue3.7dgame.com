(function install(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.XRUGCUnityDownloadProgress = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  // Observe exactly the decoded chunks already consumed by Unity. Never clone
  // or buffer an entire runtime artifact just to produce progress information.
  function trackResponse(response, file, onProgress, options = {}) {
    if (!response.body || !response.ok) return response;
    let loaded = 0;
    let lastUpdate = 0;
    const total = Number.isSafeInteger(file.responseSize) && file.responseSize > 0 ? file.responseSize : undefined;
    function report(force) {
      const now = Date.now();
      if (!force && now - lastUpdate < 250) return;
      lastUpdate = now;
      onProgress({ kind: 'bytes', loaded, total, artifact: file.role, unit: 'decoded-response-bytes', cached: options.cached === true });
    }
    report(true);
    const stream = response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        loaded += chunk.byteLength;
        if (options.onActivity) options.onActivity();
        report(false);
        controller.enqueue(chunk);
      },
      flush() {
        report(true);
        if (options.onComplete) options.onComplete();
      },
    }));
    return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  return Object.freeze({ trackResponse });
});
