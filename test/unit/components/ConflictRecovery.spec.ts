import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, reactive, type App } from "vue";
import ElementPlus from "element-plus";
import ConflictRecovery from "@/components/ConflictRecovery.vue";
import {
  captureConflictScope,
  recordConflict,
  conflictCopy,
} from "@/services/webmcp/conflict-recovery";
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/utils/request", () => ({ default: api.request }));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("vue-router", () => ({ useRoute: () => route }));
vi.mock("@/store/modules/user", () => ({ useUserStore: () => user }));
const route = reactive({ path: "/verse/scene", query: { id: "1" } });
const user = reactive({ userInfo: { id: 3 } });
let app: App;
let target: HTMLDivElement;
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
  await nextTick();
};
function click(label: string) {
  const b = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === label
  );
  if (!b) throw new Error("button missing " + label);
  b.click();
}
function mount(type: "verse" | "meta", page: string) {
  route.path = `/${type}/${page}`;
  user.userInfo.id = 3;
  api.request.mockReset();
  target = document.createElement("div");
  document.body.append(target);
  app = createApp(ConflictRecovery);
  app.use(ElementPlus);
  app.mount(target);
  const owner = { targetType: type, targetId: 1 };
  recordConflict(captureConflictScope(owner), {
    ...owner,
    action: page === "script" ? "save_code" : "save",
    operationId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    expectedRevision: `sha256:${"a".repeat(64)}`,
    localJson: '{"local":"unchanged"}',
  });
}
afterEach(() => {
  app.unmount();
  target.remove();
  document.body.innerHTML = "";
});
describe("conflict recovery UI", () => {
  it.each([
    ["verse", "scene"],
    ["verse", "script"],
    ["meta", "scene"],
    ["meta", "script"],
  ] as const)(
    "keeps %s/%s copy while reading a projected server view",
    async (type, page) => {
      mount(type, page);
      await flush();
      click("common.recovery.open");
      await flush();
      api.request.mockResolvedValue({
        data: {
          id: 1,
          serverRevision: `sha256:${"b".repeat(64)}`,
          data: { name: "new server" },
          extraPrivateField: "do-not-render",
        },
      });
      click("common.recovery.read");
      await flush();
      expect(document.body.textContent).toContain("new server");
      expect(document.body.textContent).not.toContain("do-not-render");
      expect(conflictCopy.value?.localJson).toBe('{"local":"unchanged"}');
      expect(api.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: "get" })
      );
    }
  );
  it("removes local and late remote contents when the actor changes", async () => {
    mount("verse", "scene");
    await flush();
    click("common.recovery.open");
    await flush();
    let resolve!: (v: unknown) => void;
    api.request.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    click("common.recovery.read");
    await flush();
    user.userInfo.id = 24;
    await flush();
    resolve({
      data: {
        id: 1,
        serverRevision: `sha256:${"b".repeat(64)}`,
        data: { name: "private remote" },
      },
    });
    await flush();
    expect(conflictCopy.value).toBeNull();
    expect(document.body.textContent).not.toContain("private remote");
    expect(document.body.textContent).not.toContain("unchanged");
  });
});
