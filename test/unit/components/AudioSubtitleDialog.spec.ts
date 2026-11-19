import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  reactive,
  type App,
} from "vue";
import { ElButton } from "element-plus";
import AudioSubtitleDialog from "@/components/subtitles/AudioSubtitleDialog.vue";

const api = vi.hoisted(() => ({
  getAudio: vi.fn(),
  getVideo: vi.fn(),
  putVideo: vi.fn(),
  putAudio: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("@/api/v1/resources", () => ({
  getAudio: api.getAudio,
  getVideo: api.getVideo,
  putVideo: api.putVideo,
  putAudio: api.putAudio,
}));
vi.mock("@/components/Dialog", () => ({
  Message: { error: api.error, success: api.success },
  MessageBox: { confirm: api.confirm },
}));
let app: App | undefined;
let target: HTMLElement;
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
  await nextTick();
};
const audio = (id = 22, info = '{"length":8}') => ({
  id,
  name: `Audio ${id}`,
  type: "audio",
  info,
});
async function mount(open = true, mediaType: "audio" | "video" = "audio") {
  const props = reactive({ modelValue: open, resourceId: 22, mediaType });
  const saved = vi.fn();
  target = document.createElement("div");
  document.body.append(target);
  app = createApp({
    render: () => h(AudioSubtitleDialog, { ...props, onSaved: saved }),
  });
  app.component("ElButton", ElButton);
  app.component(
    "ElDialog",
    defineComponent({
      props: { modelValue: Boolean },
      setup(props, { slots }) {
        return () =>
          props.modelValue
            ? h("section", { class: "audio-subtitle-dialog" }, [
                slots.header?.({
                  titleId: "subtitle-title",
                  titleClass: "el-dialog__title",
                }),
                slots.default?.(),
                slots.footer?.(),
              ])
            : null;
      },
    })
  );
  app.directive("loading", () => {});
  app.mount(target);
  await flush();
  return { props, saved };
}
function click(label: string) {
  const button = [...target.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === label
  )!;
  button.click();
  return button;
}
async function fill(label: string, text: string) {
  const input = target.querySelector<HTMLTextAreaElement>(
    `[aria-label="${label}"]`
  )!;
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
}
beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.putAudio.mockImplementation(async (_id, patch) => {
    api.getAudio.mockResolvedValue({ data: audio(22, patch.info) });
    return {};
  });
});
afterEach(() => {
  app?.unmount();
  target?.remove();
});

describe("shared audio subtitle editor", () => {
  it("loads only when opened, starts empty and saves both texts while preserving newer unrelated metadata", async () => {
    api.getAudio.mockResolvedValue({ data: audio() });
    const { props, saved } = await mount(false);
    expect(api.getAudio).not.toHaveBeenCalled();
    props.modelValue = true;
    await flush();
    expect(
      target.querySelector(
        '[aria-label="原文语言"], [aria-label="译文语言"], [aria-label="播放显示"]'
      )
    ).toBeNull();
    expect(target.querySelector('[aria-label="导入目标"]')).not.toBeNull();
    expect(target.querySelectorAll(".subtitle-cue")).toHaveLength(0);
    expect(click("保存字幕").disabled).toBe(true);
    click("添加字幕");
    await flush();
    await fill("第 1 条原文", "隆兴寺");
    await fill("第 1 条译文", "Longxing Temple");
    api.getAudio.mockResolvedValue({
      data: audio(22, '{"length":8,"size":128}'),
    });
    expect(click("保存字幕").disabled).toBe(false);
    await flush();
    expect(api.putAudio).toHaveBeenCalledOnce();
    const info = JSON.parse(api.putAudio.mock.calls[0][1].info);
    expect(info).toMatchObject({
      length: 8,
      size: 128,
      subtitles: [
        { start: 0, end: 3, text: "隆兴寺", translation: "Longxing Temple" },
      ],
      subtitleSettings: { display: "bilingual" },
    });
    expect(saved).toHaveBeenCalledOnce();
    expect(click("保存字幕").disabled).toBe(true);
    const writes = api.putAudio.mock.calls.length;
    expect(target.querySelectorAll(".subtitle-column-headers")).toHaveLength(1);
    expect(
      target.querySelector(".subtitle-column-headers")?.textContent
    ).toContain("开始时间结束时间原文译文");
    click("清空字幕");
    await flush();
    expect(target.querySelectorAll(".subtitle-cue")).toHaveLength(0);
    expect(api.putAudio).toHaveBeenCalledTimes(writes);
    expect(click("清空字幕").disabled).toBe(true);
    click("保存字幕");
    await flush();
    expect(
      JSON.parse(api.putAudio.mock.calls.at(-1)![1].info).subtitles
    ).toEqual([]);
  });

  it("inserts at the audio clock, formats tenths without steppers, and sorts edited times on save", async () => {
    const existing = [
      { start: 2.123, end: 3, text: "前段", translation: "Early" },
      { start: 8, end: 9, text: "后段", translation: "Late" },
    ];
    api.getAudio.mockResolvedValue({
      data: {
        ...audio(22, JSON.stringify({ length: 12, subtitles: existing })),
        file: { url: "https://example.test/audio.wav" },
      },
    });
    await mount();
    const player = target.querySelector("audio")!;
    Object.defineProperty(player, "currentTime", {
      configurable: true,
      writable: true,
      value: 4.26,
    });
    click("添加字幕");
    await flush();
    expect(
      [
        ...target.querySelectorAll<HTMLTextAreaElement>(
          ".subtitle-cue textarea:first-of-type"
        ),
      ].map((input) => input.value)
    ).toContain("前段");
    const rows = () => [
      ...target.querySelectorAll<HTMLElement>(".subtitle-cue"),
    ];
    const firstStart = rows()[0].querySelector<HTMLInputElement>("input")!;
    expect(firstStart.type).toBe("text");
    expect(firstStart.inputMode).toBe("decimal");
    expect(firstStart.value).toBe("2.1");
    const addedStart = rows()[1].querySelector<HTMLInputElement>("input")!;
    expect(addedStart.value).toBe("4.3");
    expect(document.activeElement).toBe(rows()[1].querySelector("textarea"));
    await fill("第 2 条原文", "中段");
    await fill("第 2 条译文", "Middle");
    expect(
      target.querySelector("[draggable], .subtitle-drag-handle")
    ).toBeNull();
    const lateStart = rows()[2].querySelector<HTMLInputElement>("input")!;
    lateStart.value = "3.2";
    lateStart.dispatchEvent(new Event("change", { bubbles: true }));
    const lateEnd = rows()[2].querySelectorAll<HTMLInputElement>("input")[1];
    lateEnd.value = "4.0";
    lateEnd.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    expect(rows().map((row) => row.querySelector("textarea")!.value)).toEqual([
      "前段",
      "中段",
      "后段",
    ]);
    expect(api.putAudio).not.toHaveBeenCalled();
    click("保存字幕");
    await flush();
    const result = JSON.parse(api.putAudio.mock.calls[0][1].info).subtitles;
    expect(result.map((cue: { text: string }) => cue.text)).toEqual([
      "前段",
      "后段",
      "中段",
    ]);
    expect(result.map((cue: { start: number }) => cue.start)).toEqual([
      2.123, 3.2, 4.3,
    ]);
    expect(
      result.map((cue: { translation: string }) => cue.translation)
    ).toEqual(["Early", "Late", "Middle"]);
    expect(rows().map((row) => row.querySelector("textarea")!.value)).toEqual([
      "前段",
      "后段",
      "中段",
    ]);
  });

  it("uses zero playback progress instead of falling back to the last cue, and rounds edited times to tenths", async () => {
    api.getAudio.mockResolvedValue({
      data: audio(
        22,
        JSON.stringify({ subtitles: [{ start: 5, end: 8, text: "已有字幕" }] })
      ),
    });
    await mount();
    click("添加字幕");
    await flush();
    const inputs = target.querySelectorAll<HTMLInputElement>(
      ".subtitle-cue input"
    );
    expect(inputs[0].value).toBe("0.0");
    inputs[0].value = "1.26";
    inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    expect(inputs[0].value).toBe("1.3");
    await fill("第 1 条原文", "开头");
    click("保存字幕");
    await flush();
    expect(
      JSON.parse(api.putAudio.mock.calls[0][1].info).subtitles[0].start
    ).toBe(1.3);
  });

  it("undoes and redoes text, removal and clear locally, including after saving", async () => {
    api.getAudio.mockResolvedValue({
      data: audio(
        22,
        JSON.stringify({
          subtitles: [
            { start: 0, end: 3, text: "原文", translation: "Original" },
          ],
        })
      ),
    });
    await mount();
    expect(click("撤销").disabled).toBe(true);
    expect(click("重做").disabled).toBe(true);
    await fill("第 1 条原文", "修改");
    click("撤销");
    await flush();
    expect(target.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe(
      "原文"
    );
    expect(click("保存字幕").disabled).toBe(true);
    click("重做");
    await flush();
    click("保存字幕");
    await flush();
    expect(api.putAudio).toHaveBeenCalledOnce();
    click("撤销");
    await flush();
    expect(target.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe(
      "原文"
    );
    expect(api.putAudio).toHaveBeenCalledOnce();
    expect(
      [...target.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "保存字幕"
      )!.disabled
    ).toBe(false);
    click("清空字幕");
    await flush();
    expect(target.querySelectorAll(".subtitle-cue")).toHaveLength(0);
    click("撤销");
    await flush();
    expect(target.querySelectorAll(".subtitle-cue")).toHaveLength(1);
    expect(
      target.querySelectorAll<HTMLTextAreaElement>("textarea")[1].value
    ).toBe("Original");
    click("移除");
    await flush();
    click("撤销");
    await flush();
    expect(target.querySelectorAll(".subtitle-cue")).toHaveLength(1);
  });

  it("supports scoped shortcuts, pending time input, and IME composition", async () => {
    api.getAudio.mockResolvedValue({
      data: audio(
        22,
        JSON.stringify({ subtitles: [{ start: 0, end: 3, text: "原文" }] })
      ),
    });
    const { props } = await mount();
    const key = async (
      target: Element,
      key: string,
      modifiers: KeyboardEventInit
    ) => {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      });
      target.dispatchEvent(event);
      await flush();
      return event;
    };
    const input = target.querySelector<HTMLInputElement>(
      ".subtitle-cue input"
    )!;
    input.focus();
    input.value = "1.26";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    expect(
      [...target.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "保存字幕"
      )!.disabled
    ).toBe(false);
    await key(input, "z", { metaKey: true });
    expect(input.value).toBe("0.0");
    await key(input, "z", { metaKey: true, shiftKey: true });
    expect(input.value).toBe("1.3");
    await key(input, "z", { ctrlKey: true });
    await key(input, "y", { ctrlKey: true });
    expect(input.value).toBe("1.3");
    const outside = await key(document.body, "z", { ctrlKey: true });
    expect(outside.defaultPrevented).toBe(false);
    const text = target.querySelector<HTMLTextAreaElement>("textarea")!;
    text.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true })
    );
    text.value = "输入中";
    text.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true })
    );
    const composingKey = await key(text, "z", {
      ctrlKey: true,
      isComposing: true,
    });
    expect(composingKey.defaultPrevented).toBe(false);
    text.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true })
    );
    await flush();
    await key(text, "z", { ctrlKey: true });
    expect(text.value).toBe("原文");
    props.modelValue = false;
    await flush();
    const closedKey = await key(document.body, "z", { ctrlKey: true });
    expect(closedKey.defaultPrevented).toBe(false);
    expect(api.putAudio).not.toHaveBeenCalled();
  });

  it("rejects concurrent edits to the same captions instead of overwriting another page", async () => {
    api.getAudio.mockResolvedValue({ data: audio() });
    await mount();
    click("添加字幕");
    await flush();
    await fill("第 1 条原文", "本页修改");
    api.getAudio.mockResolvedValue({
      data: audio(22, '{"subtitles":[{"start":0,"end":3,"text":"另一页"}]}'),
    });
    click("保存字幕");
    await flush();
    expect(api.putAudio).not.toHaveBeenCalled();
    expect(api.error).toHaveBeenCalledWith(
      expect.stringContaining("其他页面修改")
    );
    expect(click("保存字幕").disabled).toBe(false);
  });

  it("ignores a late response after changing the selected audio resource", async () => {
    let resolve!: (value: unknown) => void;
    api.getAudio.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    api.getAudio.mockResolvedValueOnce({ data: audio(23) });
    const { props } = await mount();
    props.resourceId = 23;
    await flush();
    expect(target.textContent).toContain("Audio 23");
    resolve({ data: audio(22) });
    await flush();
    expect(target.textContent).toContain("Audio 23");
    expect(target.textContent).not.toContain("Audio 22");
  });
});

describe("shared video subtitle editor", () => {
  it("loads and saves through video endpoints, retaining video metadata and bilingual text", async () => {
    const video = {
      ...audio(),
      type: "video",
      name: "视频讲解",
      file: { url: "https://example.com/video.mp4" },
      info: JSON.stringify({ size: { x: 1920, y: 1080 }, length: 10 }),
    };
    api.getVideo.mockResolvedValue({ data: video });
    await mount(true, "video");
    expect(api.getAudio).not.toHaveBeenCalled();
    expect(target.querySelector("video")).not.toBeNull();
    expect(target.querySelector("audio")).toBeNull();
    click("添加字幕");
    await flush();
    await fill("第 1 条原文", "天王殿");
    await fill("第 1 条译文", "Heavenly Kings Hall");
    click("保存字幕");
    await flush();
    expect(api.putVideo).toHaveBeenCalledOnce();
    expect(api.putAudio).not.toHaveBeenCalled();
    const info = JSON.parse(api.putVideo.mock.calls[0][1].info);
    expect(info.size).toEqual({ x: 1920, y: 1080 });
    expect(info.length).toBe(10);
    expect(info.subtitles[0]).toMatchObject({
      text: "天王殿",
      translation: "Heavenly Kings Hall",
    });
  });

  it("clears subtitles on end and holds the current caption while the video is paused", async () => {
    api.getVideo.mockResolvedValue({
      data: {
        ...audio(),
        type: "video",
        file: { url: "https://example.com/video.mp4" },
        info: JSON.stringify({
          subtitles: [{ start: 1, end: 4, text: "视频字幕" }],
        }),
      },
    });
    await mount(true, "video");
    const video = target.querySelector("video")!;
    video.currentTime = 2;
    video.dispatchEvent(new Event("timeupdate"));
    await flush();
    expect(
      target.querySelector(".subtitle-preview-caption")?.textContent
    ).toContain("视频字幕");
    video.dispatchEvent(new Event("pause"));
    await flush();
    expect(
      target.querySelector(".subtitle-preview-caption")?.textContent
    ).toContain("视频字幕");
    video.dispatchEvent(new Event("ended"));
    await flush();
    expect(
      target
        .querySelector(".subtitle-preview-caption")
        ?.classList.contains("subtitle-fade-leave-active")
    ).toBe(true);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await flush();
    expect(target.querySelector(".subtitle-preview-caption")).toBeNull();
  });
});
