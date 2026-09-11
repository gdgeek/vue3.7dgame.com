import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const profileDir = process.env.XRUGC_PROFILE;
const baseUrl = process.env.XRUGC_BASE_URL || "http://127.0.0.1:3001";
const sceneId = Number(process.env.XRUGC_SCENE_ID);
const artifactDir = process.env.XRUGC_E2E_ARTIFACT_DIR || "/tmp";
const apiBase = new URL(
  process.env.XRUGC_API_BASE_URL ||
    process.env.XRUGC_API_ORIGIN ||
    "http://localhost:3001/dev-api"
);
const refreshUrl = `${apiBase.origin}${apiBase.pathname.replace(/\/+$/, "")}/v1/auth/refresh`;
const skipPreview = process.env.XRUGC_SKIP_PREVIEW === "true";
const headless = process.env.XRUGC_HEADLESS !== "false";
const previewTimeoutSeconds = Number(
  process.env.XRUGC_PREVIEW_TIMEOUT_SECONDS || 360
);

if (!profileDir) {
  throw new Error(
    "XRUGC_PROFILE must point to an authenticated Chrome profile copy"
  );
}
if (!Number.isSafeInteger(sceneId) || sceneId <= 0) {
  throw new Error("XRUGC_SCENE_ID must be a positive integer");
}
if (!Number.isFinite(previewTimeoutSeconds) || previewTimeoutSeconds <= 0) {
  throw new Error("XRUGC_PREVIEW_TIMEOUT_SECONDS must be positive");
}

await mkdir(artifactDir, { recursive: true });
const blockedWrites = [];
const httpErrors = [];
const context = await chromium.launchPersistentContext(profileDir, {
  channel: "chrome",
  serviceWorkers: "block",
  headless,
  args: ["--profile-directory=Default"],
  viewport: { width: 1600, height: 1000 },
});

try {
  context.on("response", (response) => {
    if (response.status() >= 400) {
      const url = new URL(response.url());
      httpErrors.push({
        status: response.status(),
        url: `${url.origin}${url.pathname}`,
      });
    }
  });
  // Fail closed across all frames, with only the existing session refresh allowed.
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isSessionRefresh =
      request.method() === "POST" &&
      `${url.origin}${url.pathname}` === refreshUrl;
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method()) &&
      !isSessionRefresh
    ) {
      blockedWrites.push({
        method: request.method(),
        url: request.url().replace(/\?.*$/, ""),
      });
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  await context.addInitScript(() => {
    const registry = new Map();
    globalThis.__xrugcWebMcpRegistry = registry;
    const modelContext = {
      registerTool(tool, options = {}) {
        registry.set(tool.name, tool);
        options.signal?.addEventListener(
          "abort",
          () => {
            if (registry.get(tool.name) === tool) registry.delete(tool.name);
          },
          { once: true }
        );
      },
    };
    try {
      Object.defineProperty(document, "modelContext", {
        configurable: true,
        value: modelContext,
      });
    } catch {
      try {
        document.modelContext = modelContext;
      } catch {
        // The acceptance shim is already installed.
      }
    }
  });

  const page = context.pages()[0] || (await context.newPage());
  const consoleErrors = [];
  const sceneWriteRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text().slice(0, 320));
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(String(error).slice(0, 320));
  });
  page.on("request", (request) => {
    const url = request.url();
    const sceneEndpoint = new RegExp(`/v1/verses/${sceneId}(?:/|\\?|$)`);
    if (request.method() !== "GET" && sceneEndpoint.test(url)) {
      sceneWriteRequests.push({
        method: request.method(),
        url: url.replace(/\?.*$/, ""),
      });
    }
  });

  const invoke = (name, input = {}) =>
    page.evaluate(
      async ({ name: toolName, input: toolInput }) => {
        const tool = globalThis.__xrugcWebMcpRegistry?.get(toolName);
        if (!tool) throw new Error(`Tool not registered: ${toolName}`);
        return await tool.execute(toolInput);
      },
      { name, input }
    );

  const completeAndCancel = async (name, draftId) => {
    const pending = invoke(name, { draftId }).then(
      (value) => ({ kind: "result", value }),
      (error) => ({ kind: "error", error: String(error) })
    );
    const messageBox = page.locator(".el-message-box:visible").last();
    const first = await Promise.race([
      pending,
      messageBox
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => ({ kind: "dialog" })),
    ]);
    if (first.kind === "error") {
      throw new Error(`${name} failed before confirmation: ${first.error}`);
    }
    if (first.kind === "result") {
      throw new Error(
        `${name} completed without visible confirmation: ${JSON.stringify(first.value)}`
      );
    }
    const dialogText = (await messageBox.innerText())
      .replace(/\s+/g, " ")
      .slice(0, 260);
    const dialogButtons = messageBox.locator(".el-message-box__btns button");
    const buttonTexts = await dialogButtons.allInnerTexts();
    assert.ok(
      buttonTexts.length >= 2,
      `${name} should show cancel and confirm`
    );
    await dialogButtons.first().click();
    const completion = await pending;
    if (completion.kind === "error") {
      throw new Error(`${name} failed after cancellation: ${completion.error}`);
    }
    return { dialogText, buttonTexts, result: completion.value };
  };

  await page.goto(`${baseUrl}/verse/scene?id=${sceneId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForFunction(
    () =>
      globalThis.__xrugcWebMcpRegistry?.size === 21 ||
      location.pathname === "/web/index",
    null,
    { timeout: 30_000 }
  );

  assert.notEqual(
    new URL(page.url()).pathname,
    "/web/index",
    "LOGIN_REQUIRED: authenticate this isolated browser before acceptance"
  );

  let editorContext;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      editorContext = await invoke("xrugc_get_scene_editor_context", {});
      if (editorContext?.ready && !editorContext?.loading) break;
    } catch {
      // The iframe bridge is still becoming ready.
    }
    await page.waitForTimeout(1000);
  }
  assert.equal(editorContext?.ready, true, "scene editor should become ready");
  assert.equal(
    editorContext?.dirty,
    false,
    "acceptance requires a clean scene"
  );
  assert.equal(
    editorContext?.loading,
    false,
    "scene editor should finish loading"
  );

  const registeredTools = await page.evaluate(() =>
    [...globalThis.__xrugcWebMcpRegistry.keys()].sort()
  );
  assert.equal(registeredTools.length, 21, "all scene tools should register");

  const reliability = {
    resources: await invoke("xrugc_check_scene_resource_readiness", {}),
    publication: await invoke("xrugc_check_scene_publication_readiness", {}),
    runtime: await invoke("xrugc_get_scene_runtime_diagnostics", {}),
  };
  assert.equal(reliability.resources.sceneId, sceneId);
  assert.equal(reliability.resources.runtimeReady, "unknown");
  assert.equal(typeof reliability.publication.publicationReady, "boolean");
  assert.equal(reliability.runtime.scope, "current_page_preview");
  const modules = await invoke("xrugc_get_scene_modules", { limit: 20 });
  const firstModule = modules.modules?.[0];
  assert.ok(firstModule?.id, "the acceptance scene should contain a module");
  const inspected = await invoke("xrugc_inspect_scene_module", {
    moduleId: firstModule.id,
  });
  const validationBefore = await invoke("xrugc_validate_scene", {});
  assert.equal(validationBefore.valid, true, "scene should pass validation");
  const search = await invoke("xrugc_search_entities", {
    query: "中国空间站",
    page: 1,
    pageSize: 20,
  });
  assert.ok(search.items?.length, "entity search should return a result");

  const placementStage = await invoke("xrugc_stage_scene_entity_placement", {
    entityId: Number(search.items[0].id),
    title: `${search.items[0].title || "实体"}（E2E暂存）`,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
  });
  assert.equal(placementStage.status, "staged");
  assert.ok(placementStage.draftId);
  const placementCancel = await completeAndCancel(
    "xrugc_complete_scene_entity_placement",
    placementStage.draftId
  );

  const currentPosition = inspected.transform?.position ||
    firstModule.transform?.position || { x: 0, y: 0, z: 0 };
  const transformStage = await invoke("xrugc_stage_scene_module_transform", {
    moduleId: firstModule.id,
    transform: {
      position: { x: Number(currentPosition.x || 0) + 0.123 },
    },
  });
  assert.equal(transformStage.status, "staged");
  const transformCancel = await completeAndCancel(
    "xrugc_complete_scene_module_transform",
    transformStage.draftId
  );

  const originalTitle = inspected.title || firstModule.title;
  const propertiesStage = await invoke("xrugc_stage_scene_module_properties", {
    moduleId: firstModule.id,
    properties: { title: `${originalTitle}（E2E暂存）` },
  });
  assert.equal(propertiesStage.status, "staged");
  const propertiesCancel = await completeAndCancel(
    "xrugc_complete_scene_module_properties",
    propertiesStage.draftId
  );

  const deletionStage = await invoke("xrugc_stage_scene_module_deletion", {
    moduleId: firstModule.id,
  });
  const deletionCancel = await completeAndCancel(
    "xrugc_complete_scene_module_deletion",
    deletionStage.draftId
  );

  const publicationStage = await invoke("xrugc_stage_scene_publication", {});
  const publicationCancel = await completeAndCancel(
    "xrugc_complete_scene_publication",
    publicationStage.draftId
  );

  const cancellations = {
    placement: placementCancel,
    transform: transformCancel,
    properties: propertiesCancel,
    deletion: deletionCancel,
    publication: publicationCancel,
  };
  for (const [name, cancellation] of Object.entries(cancellations)) {
    assert.equal(
      cancellation.result.status,
      "cancelled",
      `${name} completion should be cancelled`
    );
  }

  let previewAcceptance = {
    skipped: true,
    reason: "Previously accepted preview is outside this regression scope",
  };
  if (!skipPreview) {
    const previewBefore = await invoke(
      "xrugc_get_scene_runtime_preview_status",
      {}
    );
    const previewStarted = await invoke(
      "xrugc_start_scene_runtime_preview",
      {}
    );
    let previewObserved = previewStarted;
    for (let attempt = 0; attempt < previewTimeoutSeconds; attempt += 1) {
      await page.waitForTimeout(1000);
      previewObserved = await invoke(
        "xrugc_get_scene_runtime_preview_status",
        {}
      );
      if (["running", "attention"].includes(previewObserved.phase)) {
        break;
      }
    }
    await page.screenshot({
      path: path.join(artifactDir, "xrugc-webmcp-runtime-preview.png"),
      fullPage: true,
    });
    const previewStopped = await invoke("xrugc_stop_scene_runtime_preview", {});
    assert.equal(previewBefore.phase, "closed");
    assert.equal(previewStarted.visible, true);
    assert.ok(
      previewObserved.phase === "running",
      `Unity preview should receive the scene within ${previewTimeoutSeconds} seconds`
    );
    assert.equal(previewStopped.phase, "closed");

    previewAcceptance = {
      before: previewBefore,
      started: previewStarted,
      observed: previewObserved,
      stopped: previewStopped,
    };
  }

  const finalContext = await invoke("xrugc_get_scene_editor_context", {});
  const modulesAfter = await invoke("xrugc_get_scene_modules", { limit: 20 });
  const validationAfter = await invoke("xrugc_validate_scene", {});
  const finalInspected = await invoke("xrugc_inspect_scene_module", {
    moduleId: firstModule.id,
  });
  await page.screenshot({
    path: path.join(artifactDir, "xrugc-webmcp-final.png"),
    fullPage: true,
  });

  assert.equal(
    sceneWriteRequests.length,
    0,
    "acceptance should not write scene data"
  );
  assert.equal(finalContext.dirty, false, "scene should remain clean");
  assert.equal(modulesAfter.modules?.length, modules.modules?.length);
  assert.equal(finalInspected.title, inspected.title);
  assert.deepEqual(finalInspected.transform, inspected.transform);
  assert.equal(modulesAfter.moduleCount, modules.moduleCount);
  assert.equal(validationAfter.valid, true);

  assert.equal(
    blockedWrites.length,
    0,
    "acceptance must not attempt any write"
  );
  const report = {
    page: { url: page.url(), title: await page.title() },
    registration: { count: registeredTools.length, tools: registeredTools },
    reliability,
    readAcceptance: {
      context: editorContext,
      moduleCount: modules.moduleCount,
      inspected: {
        id: firstModule.id,
        title: inspected.title,
        entityId: inspected.entityId,
      },
      validation: {
        valid: validationBefore.valid,
        errorCount: validationBefore.errors?.length || 0,
        warningCount: validationBefore.warnings?.length || 0,
      },
      entitySearchCount: search.items.length,
    },
    stagedCancellationAcceptance: Object.fromEntries(
      Object.entries(cancellations).map(([name, cancellation]) => [
        name,
        {
          status: cancellation.result.status,
          dialog: cancellation.dialogText,
        },
      ])
    ),
    previewAcceptance,
    blockedWrites,
    noMutationProof: {
      sceneWriteRequestCount: sceneWriteRequests.length,
      dirtyAfter: finalContext.dirty,
      moduleCountBefore: modules.modules?.length,
      moduleCountAfter: modulesAfter.modules?.length,
      titleUnchanged: finalInspected.title === inspected.title,
      validationStillValid: validationAfter.valid,
    },
    consoleErrors: [...new Set(consoleErrors)].slice(0, 20),
  };
  await writeFile(
    path.join(artifactDir, "report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await writeFile(
    path.join(artifactDir, "failure.json"),
    JSON.stringify(
      {
        error: String(error),
        blockedWrites,
        httpErrors,
        pageUrl: context.pages()[0]?.url(),
      },
      null,
      2
    )
  );
  const page = context.pages()[0];
  if (page)
    await page
      .screenshot({
        path: path.join(artifactDir, "failure.png"),
        fullPage: true,
      })
      .catch(() => {});
  throw error;
} finally {
  await context.close();
}
