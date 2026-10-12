import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, reactive, type App } from "vue";
import ElementPlus from "element-plus";
import PublicationHistoryDialog from "@/components/MrPP/PublicationHistoryDialog.vue";
const api = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn() }));
vi.mock("@/api/v1/publication-history", () => ({
  listScenePublications: api.list,
  readVerifiedPublication: api.read,
}));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
const id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const row = {
  sceneId: 1,
  publicationVersionId: id,
  contentHash: "sha256:abc",
  createdAt: 1,
  language: "lua",
  canonicalBody: JSON.stringify({ runtime: { resources: [] } }),
};
let app: App;
let target: HTMLDivElement;
const props = reactive({ modelValue: true, sceneId: 1, actorId: "3" });
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
  await nextTick();
};
function click(text: string) {
  const button = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text
  );
  if (!button) throw new Error(`Missing ${text}`);
  button.click();
}
beforeEach(async () => {
  api.list.mockReset();
  api.read.mockReset();
  api.list.mockResolvedValue({
    data: {
      sceneId: 1,
      items: [row],
      total: 1,
      totalBytes: 100,
      sceneBudgetBytes: 512000000,
    },
  });
  props.modelValue = true;
  props.sceneId = 1;
  props.actorId = "3";
  target = document.createElement("div");
  document.body.append(target);
  app = createApp({ render: () => h(PublicationHistoryDialog, props) });
  app.use(ElementPlus);
  app.mount(target);
  await flush();
});
afterEach(() => {
  app.unmount();
  target.remove();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
describe("publication history privacy and export", () => {
  it("does not repaint an old body after a refresh rejects access", async () => {
    let resolve!: (v: unknown) => void;
    api.read.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    click("common.publicationHistory.inspect");
    await flush();
    api.list.mockRejectedValueOnce({ response: { status: 403 } });
    click("common.publicationHistory.refresh");
    await flush();
    resolve(row);
    await flush();
    expect(document.body.textContent).toContain(
      "common.publicationHistory.forbidden"
    );
    expect(document.body.textContent).not.toContain("sha256:abc");
  });
  it("rechecks permission before exporting and refuses a revoked cached body", async () => {
    api.read.mockResolvedValueOnce(row);
    click("common.publicationHistory.inspect");
    await flush();
    api.read.mockRejectedValueOnce({ response: { status: 403 } });
    click("common.publicationHistory.export");
    await flush();
    expect(api.read).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain(
      "common.publicationHistory.forbidden"
    );
    expect(document.body.textContent).not.toContain("sha256:abc");
  });
  it("discards an in-flight body when the actor changes", async () => {
    let resolve!: (v: unknown) => void;
    api.read.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    click("common.publicationHistory.inspect");
    await flush();
    props.actorId = "24";
    await flush();
    resolve(row);
    await flush();
    expect(document.body.textContent).not.toContain("sha256:abc");
  });
});

it("shows retention policy and an explicit expired-version message", async () => {
  api.list.mockResolvedValueOnce({
    data: {
      sceneId: 1,
      items: [row],
      total: 1,
      totalBytes: 100,
      sceneBudgetBytes: 512000000,
      retention: {
        maxVersions: 20,
        expiredVersions: 1,
        policy: "latest_versions",
        expiredVersionHttpStatus: 410,
      },
    },
  });
  click("common.publicationHistory.refresh");
  await flush();
  expect(document.body.textContent).toContain(
    "common.publicationHistory.retention"
  );
  api.read.mockRejectedValueOnce({
    response: { status: 410, data: { message: "publication_version_expired" } },
  });
  click("common.publicationHistory.inspect");
  await flush();
  expect(document.body.textContent).toContain(
    "common.publicationHistory.expired"
  );
  expect(document.body.textContent).not.toContain("sha256:abc");
  expect(api.read).toHaveBeenCalledTimes(1);
});
