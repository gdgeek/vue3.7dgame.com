/**
 * Unit tests for src/composables/useCampusMemberList.ts
 *
 * Tests state management and actions.  Network calls (usePageData) and
 * dialog helpers (Message, MessageBox) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useCampusMemberList,
  type MemberBase,
} from "@/composables/useCampusMemberList";

// -----------------------------------------------------------------------
// Mocks — use vi.hoisted to avoid hoisting issues
// -----------------------------------------------------------------------
const mockMessageInfo = vi.hoisted(() => vi.fn());
const mockMessageSuccess = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());
const mockConfirm = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/Dialog", () => ({
  Message: { info: mockMessageInfo, success: mockMessageSuccess },
  MessageBox: { confirm: mockConfirm },
}));

vi.mock("@/composables/usePageData", () => ({
  usePageData: () => ({
    items: { value: [] },
    loading: { value: false },
    total: { value: 0 },
    page: { value: 1 },
    perPage: { value: 20 },
    search: { value: "" },
    refresh: mockRefresh,
    handleSearch: vi.fn(),
    handleSortChange: vi.fn(),
    handlePageChange: vi.fn(),
  }),
}));

// -----------------------------------------------------------------------
// Test fixtures
// -----------------------------------------------------------------------
type TestMember = MemberBase & { role: string };

const makeMember = (id: number): TestMember => ({
  id,
  role: "student",
  user: { nickname: "User " + id, username: "user" + id },
  school: { name: "Test School" },
});

function makeOptions() {
  return {
    fetchFn: vi.fn().mockResolvedValue({ data: [], headers: {} }),
    deleteFn: vi.fn().mockResolvedValue(undefined),
    addPendingKey: "campus.addPending",
    removeConfirmKey: "campus.removeConfirm",
    detailPropertiesFn: (item: TestMember, t: (k: string) => string) => [
      { label: t("campus.role"), value: item.role },
    ],
  };
}

// -----------------------------------------------------------------------
// openDetail / handlePanelClose
// -----------------------------------------------------------------------
describe("useCampusMemberList — detail panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("openDetail sets currentMember and opens panel", () => {
    const { openDetail, currentMember, detailVisible } =
      useCampusMemberList<TestMember>(makeOptions());

    const member = makeMember(1);
    openDetail(member);

    expect(currentMember.value).toEqual(member);
    expect(detailVisible.value).toBe(true);
  });

  it("handlePanelClose clears currentMember", () => {
    const { openDetail, handlePanelClose, currentMember } =
      useCampusMemberList<TestMember>(makeOptions());

    openDetail(makeMember(1));
    expect(currentMember.value).not.toBeNull();

    handlePanelClose();
    expect(currentMember.value).toBeNull();
  });

  it("detailProperties is empty when no member is selected", () => {
    const { detailProperties } = useCampusMemberList<TestMember>(makeOptions());
    expect(detailProperties.value).toEqual([]);
  });

  it("detailProperties reflects current member via detailPropertiesFn", () => {
    const { openDetail, detailProperties } =
      useCampusMemberList<TestMember>(makeOptions());

    openDetail(makeMember(42));
    expect(detailProperties.value).toEqual([
      { label: "campus.role", value: "student" },
    ]);
  });
});

// -----------------------------------------------------------------------
// addMember
// -----------------------------------------------------------------------
describe("useCampusMemberList — addMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Message.info with the addPendingKey", () => {
    const { addMember } = useCampusMemberList<TestMember>(makeOptions());
    addMember();
    expect(mockMessageInfo).toHaveBeenCalledWith("campus.addPending");
  });
});

// -----------------------------------------------------------------------
// handleDelete
// -----------------------------------------------------------------------
describe("useCampusMemberList — handleDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  it("does nothing when no member is selected", async () => {
    const options = makeOptions();
    const { handleDelete } = useCampusMemberList<TestMember>(options);
    await handleDelete();
    expect(options.deleteFn).not.toHaveBeenCalled();
  });

  it("calls deleteFn with member id after confirmation", async () => {
    const options = makeOptions();
    const { openDetail, handleDelete } =
      useCampusMemberList<TestMember>(options);

    openDetail(makeMember(7));
    await handleDelete();

    expect(options.deleteFn).toHaveBeenCalledWith(7);
  });

  it("calls refresh() after successful delete", async () => {
    const options = makeOptions();
    const { openDetail, handleDelete } =
      useCampusMemberList<TestMember>(options);

    openDetail(makeMember(7));
    await handleDelete();

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("closes the detail panel after successful delete", async () => {
    const options = makeOptions();
    const { openDetail, handleDelete, detailVisible } =
      useCampusMemberList<TestMember>(options);

    openDetail(makeMember(7));
    expect(detailVisible.value).toBe(true);
    await handleDelete();
    expect(detailVisible.value).toBe(false);
  });

  it("shows success message after successful delete", async () => {
    const options = makeOptions();
    const { openDetail, handleDelete } =
      useCampusMemberList<TestMember>(options);

    openDetail(makeMember(7));
    await handleDelete();

    expect(mockMessageSuccess).toHaveBeenCalledWith(
      "manager.messages.removeSuccess"
    );
  });

  it("does not delete when user cancels confirmation", async () => {
    mockConfirm.mockRejectedValue(new Error("cancel"));
    const options = makeOptions();
    const { openDetail, handleDelete } =
      useCampusMemberList<TestMember>(options);

    openDetail(makeMember(7));
    await handleDelete();

    expect(options.deleteFn).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// additional edge cases
// -----------------------------------------------------------------------
describe("useCampusMemberList — additional state tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  it("detailLoading starts as false", () => {
    const { detailLoading } = useCampusMemberList<TestMember>(makeOptions());
    expect(detailLoading.value).toBe(false);
  });

  it("detailVisible starts as false", () => {
    const { detailVisible } = useCampusMemberList<TestMember>(makeOptions());
    expect(detailVisible.value).toBe(false);
  });

  it("openDetail called twice updates to the second member", () => {
    const { openDetail, currentMember } =
      useCampusMemberList<TestMember>(makeOptions());
    openDetail(makeMember(1));
    openDetail(makeMember(2));
    expect(currentMember.value?.id).toBe(2);
  });

  it("detailProperties returns empty array after handlePanelClose", () => {
    const { openDetail, handlePanelClose, detailProperties } =
      useCampusMemberList<TestMember>(makeOptions());
    openDetail(makeMember(1));
    expect(detailProperties.value.length).toBeGreaterThan(0);
    handlePanelClose();
    expect(detailProperties.value).toEqual([]);
  });

  it("deletedWindow does not change detailVisible", async () => {
    const options = makeOptions();
    const { deletedWindow, detailVisible } =
      useCampusMemberList<TestMember>(options);
    expect(detailVisible.value).toBe(false);
    await deletedWindow(makeMember(3));
    expect(detailVisible.value).toBe(false);
  });

  it("handleDelete does not call deleteFn when dialog is cancelled", async () => {
    mockConfirm.mockRejectedValue("cancel");
    const options = makeOptions();
    const { openDetail, handleDelete } =
      useCampusMemberList<TestMember>(options);
    openDetail(makeMember(10));
    await handleDelete();
    expect(options.deleteFn).not.toHaveBeenCalled();
  });
});
describe("useCampusMemberList — deletedWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  it("calls deleteFn with item id after confirmation", async () => {
    const options = makeOptions();
    const { deletedWindow } = useCampusMemberList<TestMember>(options);

    await deletedWindow(makeMember(5));
    expect(options.deleteFn).toHaveBeenCalledWith(5);
  });

  it("calls refresh() after successful delete", async () => {
    const options = makeOptions();
    const { deletedWindow } = useCampusMemberList<TestMember>(options);

    await deletedWindow(makeMember(5));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows success message after successful delete", async () => {
    const options = makeOptions();
    const { deletedWindow } = useCampusMemberList<TestMember>(options);

    await deletedWindow(makeMember(5));
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      "manager.messages.removeSuccess"
    );
  });

  it("does not delete when user cancels confirmation", async () => {
    mockConfirm.mockRejectedValue(new Error("cancel"));
    const options = makeOptions();
    const { deletedWindow } = useCampusMemberList<TestMember>(options);

    await deletedWindow(makeMember(5));
    expect(options.deleteFn).not.toHaveBeenCalled();
  });
});
