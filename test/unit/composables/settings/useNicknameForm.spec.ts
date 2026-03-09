import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, createApp, defineComponent, h } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mockSetUserInfo = vi.fn();
vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({ setUserInfo: mockSetUserInfo }),
}));

const mockElMessage = { success: vi.fn(), error: vi.fn() };
vi.mock("element-plus", () => ({
  ElMessage: mockElMessage,
}));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
const cleanups: Array<() => void> = [];

function mountInSetup<T>(factory: () => T): T {
  let result: T;
  const app = createApp(
    defineComponent({
      setup() {
        result = factory();
        return () => h("div");
      },
    })
  );
  const el = document.createElement("div");
  app.mount(el);
  cleanups.push(() => app.unmount());
  return result!;
}

describe("useNicknameForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanups.forEach((cleanup) => cleanup());
    cleanups.length = 0;
  });

  const importComposable = async () => {
    const { useNicknameForm } = await import(
      "@/views/settings/composables/useNicknameForm"
    );
    return useNicknameForm;
  };

  it("initializes with empty nickname", async () => {
    const useNicknameForm = await importComposable();
    const isLoading = ref(false);
    const isDisable = ref(false);
    const { nicknameForm } = mountInSetup(() =>
      useNicknameForm({ isLoading, isDisable })
    );
    expect(nicknameForm.value.nickname).toBe("");
  });

  it("returns nickname validation rules", async () => {
    const useNicknameForm = await importComposable();
    const isLoading = ref(false);
    const isDisable = ref(false);
    const { nicknameRules } = mountInSetup(() =>
      useNicknameForm({ isLoading, isDisable })
    );
    expect(nicknameRules).toHaveProperty("nickname");
    expect(Array.isArray(nicknameRules.nickname)).toBe(true);
  });

  describe("nicknameRules validator", () => {
    const getValidator = async () => {
      const useNicknameForm = await importComposable();
      const isLoading = ref(false);
      const isDisable = ref(false);
      const { nicknameRules } = mountInSetup(() =>
        useNicknameForm({ isLoading, isDisable })
      );
      const rules = nicknameRules.nickname as Array<{
        validator?: (
          rule: unknown,
          value: string,
          callback: (err?: Error) => void
        ) => void;
      }>;
      return rules.find((r) => r.validator)!.validator!;
    };

    it("calls callback with error for empty value", async () => {
      const validator = await getValidator();
      const callback = vi.fn();
      validator({}, "", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("calls callback with error for invalid characters", async () => {
      const validator = await getValidator();
      const callback = vi.fn();
      validator({}, "invalid@name!", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("calls callback without error for valid nickname", async () => {
      const validator = await getValidator();
      const callback = vi.fn();
      validator({}, "validName123", callback);
      expect(callback).toHaveBeenCalledWith();
    });

    it("allows Chinese characters in nickname", async () => {
      const validator = await getValidator();
      const callback = vi.fn();
      validator({}, "用户名", callback);
      expect(callback).toHaveBeenCalledWith();
    });
  });

  describe("submitNickname", () => {
    it("sets isDisable temporarily", async () => {
      vi.useFakeTimers();
      const useNicknameForm = await importComposable();
      const isLoading = ref(false);
      const isDisable = ref(false);
      const { submitNickname, nickNameFormRef } = mountInSetup(() =>
        useNicknameForm({
          isLoading,
          isDisable,
        })
      );

      // Mock form ref validation
      nickNameFormRef.value = {
        validate: vi
          .fn()
          .mockImplementation((cb: (valid: boolean) => void) => cb(false)),
      } as never;

      submitNickname();
      expect(isDisable.value).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(isDisable.value).toBe(false);
      vi.useRealTimers();
    });

    it("calls setUserInfo when form is valid", async () => {
      const useNicknameForm = await importComposable();
      const isLoading = ref(false);
      const isDisable = ref(false);
      const { submitNickname, nicknameForm, nickNameFormRef } = mountInSetup(
        () => useNicknameForm({ isLoading, isDisable })
      );

      nicknameForm.value.nickname = "TestUser";
      nickNameFormRef.value = {
        validate: vi
          .fn()
          .mockImplementation((cb: (valid: boolean) => void) => cb(true)),
      } as never;

      mockSetUserInfo.mockResolvedValue(undefined);
      await submitNickname();

      expect(mockSetUserInfo).toHaveBeenCalledWith({ nickname: "TestUser" });
    });

    it("shows error message when form is invalid", async () => {
      const useNicknameForm = await importComposable();
      const isLoading = ref(false);
      const isDisable = ref(false);
      const { submitNickname, nickNameFormRef } = mountInSetup(() =>
        useNicknameForm({
          isLoading,
          isDisable,
        })
      );

      nickNameFormRef.value = {
        validate: vi
          .fn()
          .mockImplementation((cb: (valid: boolean) => void) => cb(false)),
      } as never;

      submitNickname();

      expect(mockElMessage.error).toHaveBeenCalled();
    });

    it("resets isLoading to false when API request fails", async () => {
      const useNicknameForm = await importComposable();
      const isLoading = ref(false);
      const isDisable = ref(false);
      const { submitNickname, nicknameForm, nickNameFormRef } = mountInSetup(
        () =>
          useNicknameForm({
            isLoading,
            isDisable,
          })
      );

      nicknameForm.value.nickname = "FailedUser";
      nickNameFormRef.value = {
        validate: vi
          .fn()
          .mockImplementation((cb: (valid: boolean) => void) => cb(true)),
      } as never;
      mockSetUserInfo.mockRejectedValueOnce(new Error("network failed"));

      submitNickname();
      await flushPromises();

      expect(mockSetUserInfo).toHaveBeenCalledWith({ nickname: "FailedUser" });
      expect(mockElMessage.error).toHaveBeenCalled();
      expect(isLoading.value).toBe(false);
    });
  });
});
