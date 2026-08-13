import { beforeEach, describe, expect, it } from "vitest";
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";

describe("useScriptEditorModal", () => {
  beforeEach(() => {
    const modal = useScriptEditorModal();
    modal.rejectPendingScriptEditor();
    modal.closeScriptEditor();
  });

  it("does not mutate the visible editor until a queued switch is accepted", async () => {
    const modal = useScriptEditorModal();
    await modal.openScriptEditor({ type: "meta", metaId: 11, title: "A" });

    const switched = modal.openScriptEditor({
      type: "verse",
      verseId: 22,
      title: "B",
    });

    expect(modal.currentType.value).toBe("meta");
    expect(modal.currentMetaId.value).toBe(11);
    expect(modal.currentTitle.value).toBe("A");
    expect(modal.pendingOpenRequest.value?.verseId).toBe(22);

    expect(modal.acceptPendingScriptEditor()).toBe(true);
    await expect(switched).resolves.toBe(true);
    expect(modal.currentType.value).toBe("verse");
    expect(modal.currentVerseId.value).toBe(22);
    expect(modal.currentTitle.value).toBe("B");
  });

  it("keeps the current editor and dirty-session identity when switch is rejected", async () => {
    const modal = useScriptEditorModal();
    await modal.openScriptEditor({
      type: "meta",
      metaId: 33,
      title: "Current",
    });

    const switched = modal.openScriptEditor({ type: "meta", metaId: 44 });
    expect(modal.rejectPendingScriptEditor()).toBe(true);

    await expect(switched).resolves.toBe(false);
    expect(modal.isModalOpen.value).toBe(true);
    expect(modal.currentType.value).toBe("meta");
    expect(modal.currentMetaId.value).toBe(33);
    expect(modal.currentTitle.value).toBe("Current");
    expect(modal.pendingOpenRequest.value).toBeNull();
  });
});
