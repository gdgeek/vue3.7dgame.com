const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  createEmbedParentProtocol,
} = require("../public/modules/embed-parent-protocol.js");
const { createRuntimeState } = require("../public/modules/runtime-state.js");
const { trackResponse } = require("../public/modules/download-progress.js");
const identity = {
  protocolVersion: 1,
  sessionId: "session-1234567890123456",
  runtimeReleaseId: "a".repeat(24),
  buildId: `sha256:${"b".repeat(64)}`,
};
function fixture() {
  const parentWindow = {};
  const messages = [];
  const protocol = createEmbedParentProtocol({
    embedded: true,
    parentWindow,
    parentOrigin: "https://main.test",
    searchParams: new URLSearchParams({ sessionId: identity.sessionId }),
    postMessage: (message, origin) => messages.push({ message, origin }),
  });
  protocol.setIdentity(identity);
  const event = { source: parentWindow, origin: "https://main.test" };
  return { protocol, messages, event };
}
test("parent protocol binds exact source, origin and immutable complete identity", () => {
  const { protocol, messages, event } = fixture();
  protocol.post({
    type: "unity-web-preview-ready",
    sessionId: "cannot-override",
  });
  assert.deepEqual(messages[0], {
    message: { type: "unity-web-preview-ready", ...identity },
    origin: "https://main.test",
  });
  for (const change of [
    { sessionId: "old-session-1234567890" },
    { protocolVersion: 0 },
    { buildId: "old" },
    { runtimeReleaseId: "wrong" },
  ]) {
    assert.equal(
      protocol.accept(event, {
        type: "load-scene-json",
        ...identity,
        ...change,
      }),
      false
    );
  }
  assert.equal(
    protocol.accept(
      { ...event, source: {} },
      { type: "load-scene-json", ...identity }
    ),
    false
  );
  assert.equal(
    protocol.accept(
      { ...event, origin: "https://evil.test" },
      { type: "load-scene-json", ...identity }
    ),
    false
  );
  assert.equal(protocol.accept(event, { type: "load-scene-json" }), false);
  assert.throws(
    () =>
      protocol.setIdentity({
        ...identity,
        buildId: `sha256:${"c".repeat(64)}`,
      }),
    /cannot change/
  );
});
test("only one scene is accepted after ready and disposal silences late events", () => {
  const { protocol, messages, event } = fixture();
  const scene = { type: "load-scene-json", ...identity, payload: {} };
  assert.equal(protocol.accept(event, scene), false);
  protocol.post({ type: "unity-web-preview-ready" });
  assert.equal(protocol.accept(event, scene), true);
  assert.equal(protocol.accept(event, scene), false);
  assert.equal(
    protocol.accept(event, { type: "unity-web-preview-dispose", ...identity }),
    true
  );
  assert.equal(
    protocol.post({ type: "unity-web-preview-state", stage: "running" }),
    false
  );
  assert.equal(
    protocol.accept(event, {
      type: "unity-web-preview-runtime-confirmed",
      ...identity,
    }),
    false
  );
  assert.equal(protocol.post({ type: "unity-web-preview-disposed" }), true);
  assert.equal(protocol.post({ type: "unity-web-preview-ready" }), false);
  assert.equal(messages.length, 2);
});
test("missing, duplicate or invalid sessions fail closed", () => {
  for (const search of [
    "",
    "sessionId=short",
    `sessionId=${identity.sessionId}&sessionId=${identity.sessionId}`,
  ]) {
    const protocol = createEmbedParentProtocol({
      embedded: true,
      parentWindow: {},
      parentOrigin: "https://main.test",
      searchParams: new URLSearchParams(search),
      postMessage: () => assert.fail("invalid session posted"),
    });
    protocol.setIdentity(identity);
    assert.equal(protocol.post({ type: "unity-web-preview-ready" }), false);
  }
});
function stateFixture() {
  const messages = [];
  const timers = new Map();
  const state = createRuntimeState({
    post: (message) => messages.push(message),
    setTimeout: (callback) => {
      const id = timers.size + 1;
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  return { state, messages, timers };
}
test("visible evidence never means running; explicit native acknowledgement ends watchdog", () => {
  const { state, messages, timers } = stateFixture();
  const evidence = {
    kind: "unity-scene-started-callback",
    sceneAccepted: true,
    runtimeStarted: true,
  };
  assert.equal(state.emit("running", undefined, { evidence }), false);
  state.sceneForwarded();
  assert.equal(
    state.emit("running", undefined, {
      evidence: { kind: "unity-scene-bounds-log" },
    }),
    false
  );
  assert.equal(
    state.emit("running", undefined, {
      evidence: { ...evidence, runtimeStarted: false },
    }),
    false
  );
  assert.equal(timers.size, 1);
  assert.equal(state.emit("running", undefined, { evidence }), true);
  assert.equal(timers.size, 0);
  assert.equal(messages.at(-1).stage, "running");
});
test("scene timeout emits diagnostic error and cannot be turned into a late success", () => {
  const { state, messages, timers } = stateFixture();
  state.sceneForwarded();
  [...timers.values()][0]();
  assert.equal(
    messages.at(-1).failure.code,
    "UNITY_SCENE_CONFIRMATION_TIMEOUT"
  );
  assert.equal(
    state.emit("running", undefined, {
      evidence: {
        kind: "unity-scene-started-callback",
        sceneAccepted: true,
        runtimeStarted: true,
      },
    }),
    false
  );
  assert.equal(timers.size, 0);
});
test("download bytes use manifest decoded size, never compressed Content-Length estimates", async () => {
  const messages = [];
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(8));
        controller.enqueue(new Uint8Array(12));
        controller.close();
      },
    }),
    {
      headers: {
        "content-length": "9",
        "content-encoding": "gzip",
        "content-type": "application/wasm",
      },
    }
  );
  const result = trackResponse(
    response,
    { role: "wasm", responseSize: 20 },
    (progress) => messages.push(progress)
  );
  assert.equal((await result.arrayBuffer()).byteLength, 20);
  assert.equal(messages.at(-1).loaded, 20);
  assert.equal(messages.at(-1).total, 20);
  assert.equal(messages.at(-1).unit, "decoded-response-bytes");
  assert.equal(result.headers.get("content-type"), "application/wasm");
});
test("unknown download total remains unknown and stream cancellation reaches the source", async () => {
  let cancelled = false;
  const response = new Response(
    new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(2));
      },
      cancel() {
        cancelled = true;
      },
    })
  );
  const progress = [];
  const tracked = trackResponse(response, { role: "data" }, (value) =>
    progress.push(value)
  );
  const reader = tracked.body.getReader();
  await reader.read();
  await reader.cancel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cancelled, true);
  assert.equal(progress[0].total, undefined);
});
test("runner source parses and contains no time-derived fake progress", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "../public/embed.html"),
    "utf8"
  );
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  assert.doesNotMatch(
    script,
    /Math\.exp|estimateWebPreviewRuntimeProgress|elapsedSeconds/
  );
  assert.doesNotMatch(script, /confirmSceneStarted\s*=/);
});

function resourceFailureFixture() {
  const html = fs.readFileSync(
    path.join(__dirname, "../public/embed.html"),
    "utf8"
  );
  const source = html.slice(
    html.indexOf("      function postWebPreviewParent(message)"),
    html.indexOf("      // All fetches belong to this iframe.")
  );
  const { protocol, messages } = fixture();
  const controller = {};
  const state = createRuntimeState({
    post: (message) => protocol.post(message),
    setTimeout: () => 1,
    clearTimeout() {},
  });
  state.sceneForwarded();
  messages.length = 0;
  const context = vm.createContext({
    webPreviewDisposed: false,
    webPreviewRuntimeRelease: identity,
    webPreviewServiceWorkerController: controller,
    webPreviewAbortController: new AbortController(),
    webPreviewParentProtocol: protocol,
    webPreviewRuntimeState: state,
    navigator: { serviceWorker: { controller } },
  });
  vm.runInContext(source, context);
  const data = {
    type: "webgl-preview-scene-resource-error",
    protocolVersion: 1,
    runtimeReleaseId: identity.runtimeReleaseId,
    buildId: identity.buildId,
    code: "SCENE_RESOURCE_FETCH_FAILED",
    resource: {
      origin: "https://data.7dgame.com",
      path: "/audio/clip.wav",
      kind: "audio",
      reason: "network",
    },
  };
  return {
    context,
    controller,
    state,
    messages,
    data,
    receive: (event = { source: controller, data }) =>
      context.handleWebPreviewSceneResourceFailure(event),
  };
}

test("verified resource failures reuse the existing error bridge and immutable parent identity", () => {
  const h = resourceFailureFixture();
  h.data.resource.url = "https://data.7dgame.com/audio/clip.wav?sign=secret";
  h.receive();
  assert.equal(h.messages.length, 2);
  for (const { message, origin } of h.messages) {
    assert.equal(origin, "https://main.test");
    for (const [key, value] of Object.entries(identity))
      assert.equal(message[key], value);
    const failure = message.failure || message;
    assert.equal(failure.code, "SCENE_RESOURCE_FETCH_FAILED");
    assert.deepEqual(JSON.parse(JSON.stringify(failure.resource)), {
      origin: "https://data.7dgame.com",
      path: "/audio/clip.wav",
      kind: "audio",
      reason: "network",
    });
  }
  assert.equal(h.messages[0].message.stage, "error");
  assert.equal(h.messages[1].message.type, "unity-web-preview-error");
  assert.doesNotMatch(JSON.stringify(h.messages), /secret|sign=/);
  h.receive();
  assert.equal(
    h.messages.length,
    2,
    "later resource failures cannot repeat the terminal transition"
  );
});

test("resource errors reject stale controllers, identities, invalid diagnostics and stopped sessions", () => {
  const changes = [
    (h) => ({ source: {}, data: h.data }),
    (h) => {
      h.context.navigator.serviceWorker.controller = {};
    },
    (h) => {
      h.data.buildId = `sha256:${"c".repeat(64)}`;
    },
    (h) => {
      h.data.runtimeReleaseId = "d".repeat(24);
    },
    (h) => {
      h.data.protocolVersion = 0;
    },
    (h) => {
      h.data.type = "webgl-preview-scene-cache-status";
    },
    (h) => {
      h.data.code = "__proto__";
    },
    (h) => {
      h.data.resource.reason = "CORS";
    },
    (h) => {
      h.data.resource.kind = "script";
    },
    (h) => {
      h.data.resource.origin = "https://evil.test";
    },
    (h) => {
      h.data.resource.origin = "https://user:secret@data.7dgame.com";
    },
    (h) => {
      h.data.resource.path += "?signature=private";
    },
    (h) => {
      h.data.resource.path += "#private";
    },
    (h) => {
      h.data.resource.path += "\nprivate";
    },
    (h) => {
      h.data.resource.path = `/${"x".repeat(512)}`;
    },
    (h) => {
      h.data.resource.status = 200;
    },
    (h) => {
      h.data.code = "SCENE_RESOURCE_HTTP_ERROR";
      h.data.resource.reason = "http";
      h.data.resource.status = 200;
    },
    (h) => {
      h.data.code = "SCENE_RESOURCE_EMPTY";
      h.data.resource.reason = "empty";
      h.data.resource.status = 500;
    },
    (h) => {
      h.context.webPreviewDisposed = true;
    },
    (h) => {
      h.context.webPreviewAbortController.abort();
    },
    (h) => {
      h.state.emit("preparing");
      h.messages.length = 0;
    },
  ];
  for (const change of changes) {
    const h = resourceFailureFixture();
    h.receive(change(h));
    assert.deepEqual(h.messages, [], String(change));
  }
});

test("HTTP and empty diagnostics preserve validated status through the runner bridge", () => {
  for (const [code, reason, status] of [
    ["SCENE_RESOURCE_HTTP_ERROR", "http", 403],
    ["SCENE_RESOURCE_EMPTY", "empty", 200],
  ]) {
    const h = resourceFailureFixture();
    h.data.code = code;
    h.data.resource.reason = reason;
    h.data.resource.status = status;
    h.receive();
    assert.equal(h.messages[0].message.failure.code, code);
    assert.equal(h.messages[0].message.failure.resource.status, status);
  }
});

test("dispose aborts downloads, removes listeners and acknowledges a never-resolving Quit after a bound", async () => {
  const html = fs.readFileSync(
    path.join(__dirname, "../public/embed.html"),
    "utf8"
  );
  const source = html.slice(
    html.indexOf("      function disposeWebPreview()"),
    html.indexOf("      // Shows a temporary message banner")
  );
  const messages = [];
  let callback;
  const controller = new AbortController();
  let listenerRemoved = false;
  const context = {
    webPreviewDisposed: false,
    webPreviewRuntimeState: { dispose() {} },
    webPreviewAbortController: controller,
    webPreviewCleanups: [],
    window: {
      removeEventListener() {
        listenerRemoved = true;
      },
      setTimeout(fn, ms) {
        assert.equal(ms, 2000);
        callback = fn;
        return 1;
      },
      clearTimeout() {},
    },
    handleWebPreviewParentMessage() {},
    originalWebPreviewFetch() {},
    webPreviewServiceWorkerController: null,
    webPreviewBridgeDispatch: {},
    webPreviewUnityInstance: { Quit: () => new Promise(() => {}) },
    postWebPreviewParent: (message) => messages.push(message),
    Promise,
  };
  vm.runInNewContext(`${source}\ndisposeWebPreview();`, context);
  assert.equal(controller.signal.aborted, true);
  assert.equal(listenerRemoved, true);
  callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(messages[0].type, "unity-web-preview-disposed");
  assert.equal(messages[0].quit, "timeout");
});
