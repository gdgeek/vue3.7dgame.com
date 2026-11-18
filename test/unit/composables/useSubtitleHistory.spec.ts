import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useSubtitleHistory } from "@/composables/useSubtitleHistory";
import type { SubtitleCue } from "@/utils/audioSubtitles";

afterEach(() => vi.useRealTimers());
describe("subtitle draft history", () => {
  it("coalesces typing per field and retains cue identity when undoing and redoing", () => {
    vi.useFakeTimers();
    const cues = ref<SubtitleCue[]>([{ start: 0, end: 3, text: "" }]);
    const original = cues.value[0];
    const history = useSubtitleHistory(cues);
    for (const text of ["欢", "欢迎", "欢迎来到"]) {
      cues.value[0].text = text;
      history.record("1:text");
      vi.advanceTimersByTime(100);
    }
    cues.value[0].translation = "Welcome";
    history.record("1:translation");
    history.undo();
    expect(cues.value[0]).toBe(original);
    expect(cues.value[0].text).toBe("欢迎来到");
    expect(cues.value[0].translation).toBeUndefined();
    history.undo();
    expect(cues.value[0].text).toBe("");
    expect(history.canUndo.value).toBe(false);
    history.redo();
    history.redo();
    expect(cues.value[0].translation).toBe("Welcome");
  });
  it("separates paused typing and invalidates redo after a new edit", () => {
    vi.useFakeTimers();
    const cues = ref<SubtitleCue[]>([{ start: 0, end: 3, text: "原文" }]);
    const history = useSubtitleHistory(cues);
    cues.value[0].text = "甲";
    history.record("text");
    vi.advanceTimersByTime(800);
    cues.value[0].text = "乙";
    history.record("text");
    history.undo();
    expect(cues.value[0].text).toBe("甲");
    cues.value[0].text = "丙";
    history.record("text");
    expect(history.canRedo.value).toBe(false);
    history.undo();
    expect(cues.value[0].text).toBe("甲");
  });
  it("treats replacement and clear as single actions and preserves invalid numeric drafts", () => {
    const cues = ref<SubtitleCue[]>([{ start: 0, end: null, text: "初始" }]);
    const history = useSubtitleHistory(cues);
    cues.value = [{ start: 3, end: 5, text: "导入", translation: "Imported" }];
    history.record();
    cues.value[0].start = NaN;
    history.record();
    cues.value = [];
    history.record();
    history.undo();
    expect(Number.isNaN(cues.value[0].start)).toBe(true);
    history.undo();
    expect(cues.value[0].start).toBe(3);
    history.undo();
    expect(cues.value).toEqual([{ start: 0, end: null, text: "初始" }]);
  });
  it("keeps undo after save normalization and resets when another resource is loaded", () => {
    const cues = ref<SubtitleCue[]>([{ start: 0, end: 3, text: "原文" }]);
    const history = useSubtitleHistory(cues);
    cues.value[0].text = " 修改 ";
    history.record();
    cues.value = [{ ...cues.value[0], text: "修改" }];
    history.acceptNormalization();
    history.undo();
    expect(cues.value[0].text).toBe("原文");
    history.redo();
    expect(cues.value[0].text).toBe("修改");
    cues.value = [{ start: 1, end: 2, text: "另一音频" }];
    history.reset();
    expect(history.canUndo.value).toBe(false);
    expect(history.canRedo.value).toBe(false);
  });
  it("bounds history size while retaining at least one undo for a large draft", () => {
    const cues = ref<SubtitleCue[]>([]);
    const history = useSubtitleHistory(cues);
    for (let i = 0; i < 120; i++) {
      cues.value = [{ start: i, end: i + 1, text: String(i) }];
      history.record();
    }
    let steps = 0;
    while (history.canUndo.value) {
      history.undo();
      steps++;
    }
    expect(steps).toBe(99);
    cues.value = [{ start: 0, end: 1, text: "x".repeat(2_000_001) }];
    history.record();
    expect(history.canUndo.value).toBe(true);
  });
});
