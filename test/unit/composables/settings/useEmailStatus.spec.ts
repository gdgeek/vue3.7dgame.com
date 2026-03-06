import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetEmailStatus = vi.fn();

vi.mock("@/api/v1/email", () => ({
  getEmailStatus: mockGetEmailStatus,
}));

describe("useEmailStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const importComposable = async () => {
    const { useEmailStatus } = await import(
      "@/views/settings/composables/useEmailStatus"
    );
    return useEmailStatus;
  };

  describe("initial state", () => {
    it("starts with emailBound = false", async () => {
      const useEmailStatus = await importComposable();
      const { emailBound } = useEmailStatus();
      expect(emailBound.value).toBe(false);
    });

    it("starts with empty currentBoundEmail", async () => {
      const useEmailStatus = await importComposable();
      const { currentBoundEmail } = useEmailStatus();
      expect(currentBoundEmail.value).toBe("");
    });

    it("starts with dialogEmailVisible = false", async () => {
      const useEmailStatus = await importComposable();
      const { dialogEmailVisible } = useEmailStatus();
      expect(dialogEmailVisible.value).toBe(false);
    });
  });

  describe("refreshEmailStatusSummary", () => {
    it("sets emailBound and currentBoundEmail on success", async () => {
      mockGetEmailStatus.mockResolvedValue({
        success: true,
        data: { email: "user@example.com", email_verified: true },
      });

      const useEmailStatus = await importComposable();
      const { emailBound, currentBoundEmail, refreshEmailStatusSummary } = useEmailStatus();
      await refreshEmailStatusSummary();

      expect(emailBound.value).toBe(true);
      expect(currentBoundEmail.value).toBe("user@example.com");
    });

    it("clears state when response is not successful", async () => {
      mockGetEmailStatus.mockResolvedValue({ success: false });

      const useEmailStatus = await importComposable();
      const { emailBound, currentBoundEmail, refreshEmailStatusSummary } = useEmailStatus();
      await refreshEmailStatusSummary();

      expect(emailBound.value).toBe(false);
      expect(currentBoundEmail.value).toBe("");
    });

    it("clears state on API error", async () => {
      mockGetEmailStatus.mockRejectedValue(new Error("Network error"));

      const useEmailStatus = await importComposable();
      const { emailBound, currentBoundEmail, refreshEmailStatusSummary } = useEmailStatus();
      await refreshEmailStatusSummary();

      expect(emailBound.value).toBe(false);
      expect(currentBoundEmail.value).toBe("");
    });
  });

  describe("checkCurrentEmailVerified", () => {
    it("returns true when email is verified", async () => {
      mockGetEmailStatus.mockResolvedValue({
        success: true,
        data: { email_verified: true },
      });

      const useEmailStatus = await importComposable();
      const { checkCurrentEmailVerified } = useEmailStatus();
      const result = await checkCurrentEmailVerified();
      expect(result).toBe(true);
    });

    it("returns false when not verified", async () => {
      mockGetEmailStatus.mockResolvedValue({
        success: true,
        data: { email_verified: false },
      });

      const useEmailStatus = await importComposable();
      const { checkCurrentEmailVerified } = useEmailStatus();
      const result = await checkCurrentEmailVerified();
      expect(result).toBe(false);
    });

    it("returns false on error", async () => {
      mockGetEmailStatus.mockRejectedValue(new Error("error"));

      const useEmailStatus = await importComposable();
      const { checkCurrentEmailVerified } = useEmailStatus();
      const result = await checkCurrentEmailVerified();
      expect(result).toBe(false);
    });
  });

  describe("getCurrentBoundEmail", () => {
    it("returns email when available", async () => {
      mockGetEmailStatus.mockResolvedValue({
        success: true,
        data: { email: "test@test.com" },
      });

      const useEmailStatus = await importComposable();
      const { getCurrentBoundEmail } = useEmailStatus();
      const email = await getCurrentBoundEmail();
      expect(email).toBe("test@test.com");
    });

    it("returns empty string on error", async () => {
      mockGetEmailStatus.mockRejectedValue(new Error("error"));

      const useEmailStatus = await importComposable();
      const { getCurrentBoundEmail } = useEmailStatus();
      const email = await getCurrentBoundEmail();
      expect(email).toBe("");
    });
  });

  describe("openEmailDialog", () => {
    it("sets dialogEmailVisible to true", async () => {
      const useEmailStatus = await importComposable();
      const { dialogEmailVisible, openEmailDialog } = useEmailStatus();
      openEmailDialog("bind");
      expect(dialogEmailVisible.value).toBe(true);
    });

    it("sets the email dialog action", async () => {
      const useEmailStatus = await importComposable();
      const { emailDialogAction, openEmailDialog } = useEmailStatus();
      openEmailDialog("change");
      expect(emailDialogAction.value).toBe("change");
    });
  });

  describe("getApiErrorMessage", () => {
    it("returns error.message when present", async () => {
      const useEmailStatus = await importComposable();
      const { getApiErrorMessage } = useEmailStatus();
      const result = getApiErrorMessage(
        { success: false, error: { message: "Specific error" } } as never,
        "Fallback"
      );
      expect(result).toBe("Specific error");
    });

    it("returns fallback when no error message", async () => {
      const useEmailStatus = await importComposable();
      const { getApiErrorMessage } = useEmailStatus();
      const result = getApiErrorMessage({ success: false } as never, "Fallback");
      expect(result).toBe("Fallback");
    });
  });
});
