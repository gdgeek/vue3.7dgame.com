/**
 * Unit tests for src/views/settings/composables/useBasicInfoForm.ts
 * Covers: initialization, validation rules, industryOptions, saveInfo
 */
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
  // FormInstance / FormRules are types-only, no runtime mock needed
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

describe("useBasicInfoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetUserInfo.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanups.forEach((cleanup) => cleanup());
    cleanups.length = 0;
  });

  const importComposable = async () => {
    const { useBasicInfoForm } = await import(
      "@/views/settings/composables/useBasicInfoForm"
    );
    return useBasicInfoForm;
  };

  const createDeps = () => ({
    isLoading: ref(false),
    isDisable: ref(false),
  });

  it("initializes infoForm with default values", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { infoForm } = mountInSetup(() => useBasicInfoForm(deps));
    expect(infoForm.value.sex).toBe("man");
    expect(infoForm.value.industry).toBe("");
    expect(infoForm.value.selectedOptions).toEqual([]);
    expect(infoForm.value.textarea).toBe("");
  });

  it("returns infoRules with required fields", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { infoRules } = mountInSetup(() => useBasicInfoForm(deps));
    expect(infoRules.value).toHaveProperty("industry");
    expect(infoRules.value).toHaveProperty("selectedOptions");
    expect(infoRules.value).toHaveProperty("textarea");
  });

  it("industry rule has required: true", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { infoRules } = mountInSetup(() => useBasicInfoForm(deps));
    const industryRules = infoRules.value.industry as Array<{
      required?: boolean;
    }>;
    expect(industryRules[0].required).toBe(true);
  });

  it("textarea rule includes min:10 constraint", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { infoRules } = mountInSetup(() => useBasicInfoForm(deps));
    const textareaRules = infoRules.value.textarea as Array<{ min?: number }>;
    const minRule = textareaRules.find((r) => r.min !== undefined);
    expect(minRule?.min).toBe(10);
  });

  it("returns industryOptions as computed with 7 entries", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { industryOptions } = mountInSetup(() => useBasicInfoForm(deps));
    expect(industryOptions.value).toHaveLength(7);
  });

  it("industryOptions each have label and value keys", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { industryOptions } = mountInSetup(() => useBasicInfoForm(deps));
    for (const opt of industryOptions.value) {
      expect(opt).toHaveProperty("label");
      expect(opt).toHaveProperty("value");
    }
  });

  it("returns ruleFormRef as a ref", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { ruleFormRef } = mountInSetup(() => useBasicInfoForm(deps));
    expect(ruleFormRef).toBeDefined();
  });

  describe("saveInfo", () => {
    it("sets isDisable to true then false via setTimeout", async () => {
      vi.useFakeTimers();
      const useBasicInfoForm = await importComposable();
      const deps = createDeps();
      const { saveInfo } = mountInSetup(() => useBasicInfoForm(deps));

      saveInfo();
      expect(deps.isDisable.value).toBe(true);

      await vi.runAllTimersAsync();
      expect(deps.isDisable.value).toBe(false);
      vi.useRealTimers();
    });

    it("calls ruleFormRef.validate if ruleFormRef is set", async () => {
      const useBasicInfoForm = await importComposable();
      const deps = createDeps();
      const { saveInfo, ruleFormRef } = mountInSetup(() =>
        useBasicInfoForm(deps)
      );

      const mockValidate = vi.fn();
      ruleFormRef.value = { validate: mockValidate } as never;

      saveInfo();
      expect(mockValidate).toHaveBeenCalled();
    });

    it("calls setUserInfo and shows success message on valid form", async () => {
      const useBasicInfoForm = await importComposable();
      const deps = createDeps();
      const { saveInfo, ruleFormRef } = mountInSetup(() =>
        useBasicInfoForm(deps)
      );

      ruleFormRef.value = {
        validate: async (cb: (valid: boolean) => Promise<void>) => {
          await cb(true);
        },
      } as never;

      await saveInfo();
      expect(mockSetUserInfo).toHaveBeenCalled();
      expect(mockElMessage.success).toHaveBeenCalled();
    });

    it("shows error message when form is invalid", async () => {
      const useBasicInfoForm = await importComposable();
      const deps = createDeps();
      const { saveInfo, ruleFormRef } = mountInSetup(() =>
        useBasicInfoForm(deps)
      );

      ruleFormRef.value = {
        validate: async (cb: (valid: boolean) => Promise<void>) => {
          await cb(false);
        },
      } as never;

      await saveInfo();
      expect(mockElMessage.error).toHaveBeenCalled();
    });

    it("resets isLoading to false when API request fails", async () => {
      const useBasicInfoForm = await importComposable();
      const deps = createDeps();
      const { saveInfo, ruleFormRef } = mountInSetup(() =>
        useBasicInfoForm(deps)
      );

      ruleFormRef.value = {
        validate: async (cb: (valid: boolean) => Promise<void>) => {
          await cb(true);
        },
      } as never;
      mockSetUserInfo.mockRejectedValueOnce(new Error("network failed"));

      saveInfo();
      await flushPromises();

      expect(mockSetUserInfo).toHaveBeenCalled();
      expect(mockElMessage.error).toHaveBeenCalled();
      expect(deps.isLoading.value).toBe(false);
    });
  });
});
