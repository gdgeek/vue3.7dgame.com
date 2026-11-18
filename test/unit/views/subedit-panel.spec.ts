import { createApp, type App } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SubeditPanel from "@/views/subtitle/SubeditPanel.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ locale: { value: "zh-CN" } }),
}));

const source = [
  "1",
  "00:00:00,125 --> 00:00:02,000",
  "第一行",
  "第二行",
  "",
  "2",
  "00:00:01,000 --> 00:00:03,000",
  "待校订",
].join("\n");

describe("独立字幕编辑", () => {
  let app: App;
  let host: HTMLDivElement;
  let panel: InstanceType<typeof SubeditPanel>;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    app = createApp(SubeditPanel, { initialSrt: source });
    panel = app.mount(host) as InstanceType<typeof SubeditPanel>;
  });
  afterEach(() => {
    app.unmount();
    host.remove();
  });
  function changeTime(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event("change"));
  }
  it("serializes the selected cue with its new text and millisecond timecodes", () => {
    expect(panel.hasChanges()).toBe(false);
    expect(
      host.querySelector("select, video, audio, input[type=file]")
    ).toBeNull();
    host.querySelectorAll<HTMLElement>(".se-row")[1].click();
    const [start, end] = Array.from(host.querySelectorAll("input"));
    changeTime(start, "00:00:01,456");
    changeTime(end, "00:00:03,789");
    const text = host.querySelector("textarea")!;
    text.value = "新对白\n第二行";
    text.dispatchEvent(new Event("input"));
    expect(panel.hasChanges()).toBe(true);
    expect(panel.reportValidity()).toBe(true);
    expect(panel.getText()).toBe(
      source.replace(
        "01,000 --> 00:00:03,000\n待校订",
        "01,456 --> 00:00:03,789\n新对白\n第二行"
      )
    );
  });

  it("keeps a malformed time visible for correction and refuses saving it", () => {
    const start = host.querySelector("input")!;
    changeTime(start, "00:62:00,000");
    expect(panel.hasChanges()).toBe(true);
    expect(panel.reportValidity()).toBe(false);
    host.querySelectorAll<HTMLElement>(".se-row")[1].click();
    expect(host.querySelector("textarea")!.value).toBe("第一行\n第二行");
    changeTime(start, "00:00:00,125");
    expect(panel.reportValidity()).toBe(true);
    expect(panel.hasChanges()).toBe(false);
  });
});
