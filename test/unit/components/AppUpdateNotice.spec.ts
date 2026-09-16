import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, type App } from "vue";
import AppUpdateNotice from "@/components/AppUpdateNotice.vue";
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
let app: App;
let target: HTMLDivElement;
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  await nextTick();
};
afterEach(() => {
  app?.unmount();
  target?.remove();
  vi.unstubAllGlobals();
});
function mount() {
  target = document.createElement("div");
  document.body.append(target);
  app = createApp(AppUpdateNotice);
  app.mount(target);
}
describe("safe update notice", () => {
  it("shows an informational notice without a reload action", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ schemaVersion: 1, buildTimestamp: 1 }),
      });
    vi.stubGlobal("fetch", fetch);
    mount();
    await flush();
    expect(target.textContent).toContain("common.appUpdate.available");
    expect(fetch).toHaveBeenCalledWith(
      "/app-release.json",
      expect.objectContaining({
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      })
    );
    expect(target.querySelectorAll("button")).toHaveLength(1);
    target.querySelector("button")!.click();
    await flush();
    expect(target.textContent).toBe("");
  });
  it("stays quiet offline and aborts a pending check on disposal", async () => {
    let signal!: AbortSignal;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, options) => {
        signal = options.signal;
        return new Promise(() => {});
      })
    );
    mount();
    await flush();
    app.unmount();
    expect(signal.aborted).toBe(true);
    expect(target.textContent).toBe("");
  });
});
