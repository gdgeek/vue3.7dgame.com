/**
 * Unit tests for src/views/settings/composables/useBasicInfoForm.ts
 * Covers: initialization, validation rules, industryOptions, saveInfo
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

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

describe("useBasicInfoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetUserInfo.mockResolvedValue(undefined);
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
    const { infoForm } = useBasicInfoForm(deps);
    expect(infoForm.value.sex).toBe("man");
    expect(infoForm.value.industry).toBe("");
    expect(infoForm.value.selectedOptions).toEqual([]);
    expect(infoForm.value.textarea).toBe("");
  });

  it("returns infoRules with required fields", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { infoRules } = useBasicInfoForm(deps);
    expect(infoRules.value).toHaveProperty("industry");
    expect(infoRules.value).toHaveProperty("selectedOptions");
    expect(infoRules.value).toHaveProperty("textarea");
  });

  it("industry rule has required: true", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { infoRules } = useBasicInfoForm(deps);
    const industryRules = infoRules.value.industry as Array<{ required?: boolean }>;
    expect(industryRules[0].required).toBe(true);
  });

  it("textarea rule includes min:10 constraint", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { infoRules } = useBasicInfoForm(deps);
    const textareaRules = infoRules.value.textarea as Array<{ min?: number }>;
    const minRule = textareaRules.find((r) => r.min !== undefined);
    expect(minRule?.min).toBe(10);
  });

  it("returns industryOptions as computed with 7 entries", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { industryOptions } = useBasicInfoForm(deps);
    expect(industryOptions.value).toHaveLength(7);
  });

  it("industryOptions each have label and value keys", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { industryOptions } = useBasicInfoForm(deps);
    for (const opt of industryOptions.value) {
      expect(opt).toHaveProperty("label");
      expect(opt).toHaveProperty("value");
    }
  });

  it("returns ruleFormRef as a ref", async () => {
    const useBasicInfoForm = await importComposable();
    const deps = createDeps();
    const { ruleFormRef } = useBasicInfoForm(deps);
    expect(ruleFormRef).toBeDefined();
  });

  describe("saveInfo", () => {
    it("sets isDisable to true then false via setTimeout", async () => {
      vi.useFakeTimers();
      const useBasicInfoForm = await importComposable();
      const deps = createDeps();
      const { saveInfo } = useBasicInfoForm(deps);

      saveInfo();
      expect(deps.isDisable.value).toBe(true);

      await vi.runAllTimersAsync();
      expect(deps.isDisable.value).toBe(false);
      vi.useRealTimers();
    });

    it("calls ruleFormRef.validate if ruleFormRef is set", async () => {
      const useBasicInfoForm = await importComposable();
      const deps = createDeps();
      const { saveInfo, ruleFormRef } = useBasicInfoForm(deps);

      const mockValidate = vi.fn();
      ruleFormRef.value = { validate: mockValidate } as never;

      saveInfo();
      expect(mockValidate).toHaveBeenCalled();
    });

    it("calls setUserInfo and shows success message on valid form", async () => {
      const useBasicInfoForm = await importComposable();
      const deps = createDeps();
      const { saveInfo, ruleFormRef } = useBasicInfoForm(deps);

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
      const { saveInfo, ruleFormRef } = useBasicInfoForm(deps);

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
      const { saveInfo, ruleFormRef } = useBasicInfoForm(deps);

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
