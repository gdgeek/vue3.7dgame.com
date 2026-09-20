#!/usr/bin/env node
// Run against a separately downloaded, integrity-verified @jason.today/webmcp@0.1.13.
// Usage: node scripts/webmcp-dev-protocol-smoke.mjs /absolute/path/to/package
// This tests the real stdio/WS protocol, not a desktop client's integration.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const packageDir = process.argv[2] && resolve(process.argv[2]);
assert(
  packageDir,
  "Provide the extracted, integrity-verified upstream package directory"
);
const manifest = JSON.parse(
  await readFile(join(packageDir, "package.json"), "utf8")
);
assert.equal(manifest.name, "@jason.today/webmcp");
assert.equal(manifest.version, "0.1.13");
const taskDir = await mkdtemp(join(tmpdir(), "xrugc-webmcp-protocol-"));
const children = [];
const sockets = [];
const adapters = [];
const checks = [];
const serverToken = randomBytes(16).toString("hex");
const timeoutMs = 8000;

function deadline(promise, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Timed out: ${label}`)),
        timeoutMs
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

async function waitFor(predicate, label) {
  const expires = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= expires) throw new Error(`Timed out: ${label}`);
    await delay(25);
  }
}

async function allocatePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(
      { host: "127.0.0.1", port: 0, exclusive: true },
      resolveListen
    );
  });
  const { port } = server.address();
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

async function makeStdioClient(port, preload) {
  const child = spawn(
    process.execPath,
    [
      "--require",
      preload,
      join(packageDir, "build/index.js"),
      "--foreground",
      "--mcp",
      "--port",
      String(port),
    ],
    {
      cwd: taskDir,
      env: {
        ...process.env,
        // The upstream ignores XDG for its own state; the preload below isolates os.homedir().
        XDG_CONFIG_HOME: join(taskDir, "config"),
        XDG_DATA_HOME: join(taskDir, "data"),
        WEBMCP_SERVER_TOKEN: serverToken,
      },
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
  children.push(child);
  const pending = new Map();
  const notifications = [];
  let nextId = 1;
  let stdout = "";
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    while (stdout.includes("\n")) {
      const split = stdout.indexOf("\n");
      const line = stdout.slice(0, split).trim();
      stdout = stdout.slice(split + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        for (const waiter of pending.values())
          waiter.reject(new Error("Upstream wrote non-JSON to stdio"));
        continue;
      }
      const waiter = pending.get(message.id);
      if (waiter) {
        pending.delete(message.id);
        if (message.error)
          waiter.reject(new Error(JSON.stringify(message.error)));
        else waiter.resolve(message.result);
      } else if (message.method) notifications.push(message);
    }
  });
  child.once("exit", (code, signal) => {
    for (const waiter of pending.values())
      waiter.reject(new Error(`Upstream exited (${code ?? signal})`));
  });
  function request(method, params = {}) {
    const id = nextId++;
    const result = new Promise((resolveRequest, reject) =>
      pending.set(id, { resolve: resolveRequest, reject })
    );
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`
    );
    return deadline(result, method).finally(() => pending.delete(id));
  }
  // Wait for the authenticated /mcp connection, which opens after stdio setup.
  await waitFor(() => {
    assert.equal(child.exitCode, null, "Upstream exited during startup");
    assert.equal(
      child.signalCode,
      null,
      "Upstream was terminated during startup"
    );
    return stderr.includes("Connected to WebSocket server on path: /mcp");
  }, "upstream startup");
  const init = await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "xrugc-protocol-smoke", version: "1" },
  });
  // npm 0.1.13 ships a bundle whose MCP metadata still reports 0.1.12.
  assert.equal(init.serverInfo.version, "0.1.12");
  child.stdin.write(
    `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`
  );
  return { request, notifications };
}

function makeSocket(url) {
  const socket = new WebSocket(url);
  sockets.push(socket);
  const queued = [];
  const waiters = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const index = waiters.findIndex((waiter) => waiter.predicate(message));
    if (index < 0) queued.push(message);
    else waiters.splice(index, 1)[0].resolve(message);
  });
  return {
    socket,
    opened: deadline(
      new Promise((resolveOpen, reject) => {
        socket.addEventListener("open", resolveOpen, { once: true });
        socket.addEventListener(
          "error",
          () => reject(new Error("WebSocket connection failed")),
          { once: true }
        );
      }),
      "WebSocket open"
    ),
    next(predicate) {
      const index = queued.findIndex(predicate);
      if (index >= 0) return Promise.resolve(queued.splice(index, 1)[0]);
      return deadline(
        new Promise((resolveNext) =>
          waiters.push({ predicate, resolve: resolveNext })
        ),
        "WebSocket message"
      );
    },
    send(value) {
      socket.send(typeof value === "string" ? value : JSON.stringify(value));
    },
  };
}

try {
  // Override only this test subprocess's os.homedir(), before loading the unmodified
  // upstream bundle. HOME is untouched, and real ~/.webmcp is never read or written.
  const preload = join(taskDir, "isolated-home.cjs");
  await writeFile(
    preload,
    `const os = require('node:os');\nos.homedir = () => ${JSON.stringify(taskDir)};\nrequire('node:module').syncBuiltinESMExports();\n`
  );
  const port = await allocatePort();
  const primary = await makeStdioClient(port, preload);
  const initial = await primary.request("tools/list");
  assert(initial.tools.some((tool) => tool.name === "_webmcp_get-token"));
  const tokenResult = await primary.request("tools/call", {
    name: "_webmcp_get-token",
    arguments: {},
  });
  const encoded = tokenResult.content[0].text.trim().split("\n").at(-1);
  const connection = JSON.parse(Buffer.from(encoded, "base64").toString());
  assert.equal(connection.server, `ws://localhost:${port}`);
  const registration = makeSocket(`${connection.server}/register`);
  await registration.opened;
  registration.send(
    Buffer.from(
      JSON.stringify({ ...connection, host: "xrugc_smoke_local" })
    ).toString("base64")
  );
  const session = await registration.next(
    (message) => message.type === "registerSuccess"
  );
  assert.equal(session.channel, "/xrugc_smoke_local");
  assert.match(session.token, /^[a-f0-9]{32}$/);
  assert.notEqual(session.token, connection.token);
  const reusedRegistration = makeSocket(`${connection.server}/register`);
  await reusedRegistration.opened;
  reusedRegistration.send(
    Buffer.from(
      JSON.stringify({ ...connection, host: "xrugc_smoke_local" })
    ).toString("base64")
  );
  assert.match(
    (await reusedRegistration.next((message) => message.type === "error"))
      .message,
    /Invalid token/
  );
  checks.push("stdio initialize / tools/list / token / one-time registration");

  const browser = makeSocket(
    `${connection.server}${session.channel}?token=${encodeURIComponent(session.token)}`
  );
  await browser.opened;
  await browser.next((message) => message.type === "welcome");
  browser.send({
    type: "registerTool",
    name: "echo",
    description: "Protocol smoke echo",
    inputSchema: { type: "object", properties: { value: { type: "string" } } },
  });
  await browser.next((message) => message.type === "toolRegistered");
  const fullName = "xrugc_smoke_local-echo";
  const discovered = await primary.request("tools/list");
  assert(discovered.tools.some((tool) => tool.name === fullName));
  await waitFor(
    () =>
      primary.notifications.some(
        (message) => message.method === "notifications/tools/list_changed"
      ),
    "list changed notification"
  );
  checks.push("registerTool / tools/list prefix / list_changed");

  const resultPromise = primary.request("tools/call", {
    name: fullName,
    arguments: { value: "verified" },
  });
  const call = await browser.next((message) => message.type === "callTool");
  assert.equal(call.tool, "echo");
  assert.deepEqual(call.arguments, { value: "verified" });
  browser.send({
    type: "toolResponse",
    id: call.id,
    result: { content: [{ type: "text", text: "verified" }] },
  });
  assert.equal((await resultPromise).content[0].text, "verified");
  checks.push("tools/call round trip / exact MCP result forwarding");

  const errorPromise = primary.request("tools/call", {
    name: fullName,
    arguments: {},
  });
  const errorCall = await browser.next(
    (message) => message.type === "callTool"
  );
  browser.send({
    type: "toolResponse",
    id: errorCall.id,
    error: "TOOL_UNAVAILABLE",
  });
  const failure = await errorPromise;
  assert.equal(failure.isError, true);
  assert.match(failure.content[0].text, /TOOL_UNAVAILABLE/);
  checks.push("wire error converted to MCP isError");

  const secondary = await makeStdioClient(port, preload);
  assert(
    (await secondary.request("tools/list")).tools.some(
      (tool) => tool.name === fullName
    )
  );
  const secondTab = makeSocket(
    `${connection.server}${session.channel}?token=${encodeURIComponent(session.token)}`
  );
  await secondTab.opened;
  secondTab.send({
    type: "registerTool",
    name: "echo",
    description: "Second tab",
    inputSchema: { type: "object" },
  });
  await secondTab.next((message) => message.type === "toolRegistered");
  const secondCallPromise = secondary.request("tools/call", {
    name: fullName,
    arguments: {},
  });
  const firstTabCall = await browser.next(
    (message) => message.type === "callTool"
  );
  browser.send({
    type: "toolResponse",
    id: firstTabCall.id,
    result: { content: [{ type: "text", text: "first-tab" }] },
  });
  assert.equal((await secondCallPromise).content[0].text, "first-tab");
  checks.push(
    "multiple stdio clients share tools / same-channel calls route to first tab"
  );

  browser.send({
    type: "listToolsResponse",
    id: "unsolicited-snapshot",
    tools: [],
  });
  assert.match(
    (await browser.next((message) => message.type === "error")).message,
    /Unknown message type/
  );
  assert(
    (await primary.request("tools/list")).tools.some(
      (tool) => tool.name === fullName
    )
  );
  checks.push("unsolicited snapshot rejected / daemon catalog remains cached");

  // Execute the actual application transport against the same upstream process.
  // TypeScript only removes types; no mocked WebSocket or server is involved.
  const ts = createRequire(import.meta.url)("typescript");
  const transportSource = await readFile(
    new URL("../src/services/webmcp/dev-transport.ts", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(transportSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const { WebMcpDevTransport } = await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
  // Browser Web Locks need browser testing; this stub isolates the wire contract.
  let lockHeld = false;
  const locks = {
    async request(_name, _options, callback) {
      if (lockHeld) return callback(null);
      lockHeld = true;
      try {
        return await callback({});
      } finally {
        lockHeld = false;
      }
    },
  };
  const adapter = new WebMcpDevTransport({
    host: "localhost:3001",
    locks,
    createWebSocket: (url) => {
      const socket = new WebSocket(url);
      sockets.push(socket);
      return socket;
    },
    tools: [
      {
        name: "smoke_adapter_echo",
        description: "Actual adapter smoke",
        inputSchema: { type: "object" },
        execute: async (args) => ({ echoed: args.value }),
      },
      {
        name: "smoke_adapter_error",
        description: "Actual adapter business error",
        inputSchema: { type: "object" },
        execute: async () => ({
          content: [{ type: "text", text: "DOMAIN_ERROR" }],
          isError: true,
        }),
      },
    ],
  });
  adapters.push(adapter);
  const adapterToken = await primary.request("tools/call", {
    name: "_webmcp_get-token",
    arguments: {},
  });
  await adapter.connect(adapterToken.content[0].text.trim().split("\n").at(-1));
  assert.equal(adapter.getState().status, "connected");
  assert(
    (await primary.request("tools/list")).tools.some(
      (tool) => tool.name === "localhost_3001-smoke_adapter_echo"
    )
  );
  const adapterResult = await primary.request("tools/call", {
    name: "localhost_3001-smoke_adapter_echo",
    arguments: { value: "real-transport" },
  });
  assert.deepEqual(JSON.parse(adapterResult.content[0].text), {
    echoed: "real-transport",
  });
  const adapterError = await primary.request("tools/call", {
    name: "localhost_3001-smoke_adapter_error",
    arguments: {},
  });
  assert.equal(adapterError.isError, true);
  assert.equal(adapterError.content[0].text, "DOMAIN_ERROR");
  adapter.disconnect(false);
  await adapter.reconnect();
  assert.equal(adapter.getState().status, "connected");
  const reconnectedResult = await primary.request("tools/call", {
    name: "localhost_3001-smoke_adapter_echo",
    arguments: { value: "reconnected" },
  });
  assert.deepEqual(JSON.parse(reconnectedResult.content[0].text), {
    echoed: "reconnected",
  });
  adapter.disconnect();
  assert.equal(adapter.getState().canReconnect, false);
  checks.push(
    "actual app transport: connect / discover / call / business error / session reconnect / disconnect"
  );
} finally {
  for (const adapter of adapters) adapter.disconnect();
  for (const socket of sockets) socket.close();
  // Stop only processes spawned by this run; never use upstream --quit or its PID lookup.
  for (const child of [...children].reverse()) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolveExit) => child.once("exit", resolveExit)),
      delay(1500),
    ]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await deadline(
        new Promise((resolveExit) => child.once("exit", resolveExit)),
        "upstream cleanup"
      );
    }
  }
  await rm(taskDir, { recursive: true, force: true });
}
console.log(
  JSON.stringify(
    {
      passed: true,
      upstream: manifest.version,
      checks,
      cleanup:
        "all spawned processes exited; isolated temporary configuration removed",
    },
    null,
    2
  )
);
