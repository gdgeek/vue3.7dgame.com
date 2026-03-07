import { ref, computed } from "vue";
import type { Ref } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/store/modules/user";
import type { _InfoType } from "@/api/user/model";
import { useSubmitThrottle } from "./useSubmitThrottle";

interface UseBasicInfoFormDeps {
  isLoading: Ref<boolean>;
  isDisable: Ref<boolean>;
}

export const useBasicInfoForm = (deps: UseBasicInfoFormDeps) => {
  const { t } = useI18n();
  const userStore = useUserStore();
  const ruleFormRef = ref<FormInstance>();
  const { startSubmitThrottle } = useSubmitThrottle({
    isDisable: deps.isDisable,
  });

  const infoForm = ref<_InfoType>({
    sex: "man",
    industry: "",
    selectedOptions: [],
    textarea: "",
  });

  const infoRules = ref<FormRules<_InfoType>>({
    industry: [
      {
        required: true,
        message: t("homepage.edit.rules.industry.message"),
        trigger: "change",
      },
    ],
    selectedOptions: [
      {
        required: true,
        message: t("homepage.edit.rules.selectedOptions.message"),
        trigger: "change",
      },
    ],
    textarea: [
      {
        required: true,
        message: t("homepage.edit.rules.textarea.message1"),
        trigger: "blur",
      },
      {
        min: 10,
        message: t("homepage.edit.rules.textarea.message2"),
        trigger: "blur",
      },
    ],
  });

  const industryOptions = computed(() => [
    {
      label: t("homepage.edit.rules.industry.label1"),
      value: t("homepage.edit.rules.industry.label1"),
    },
    {
      label: t("homepage.edit.rules.industry.label2"),
      value: t("homepage.edit.rules.industry.label2"),
    },
    {
      label: t("homepage.edit.rules.industry.label3"),
      value: t("homepage.edit.rules.industry.label3"),
    },
    {
      label: t("homepage.edit.rules.industry.label4"),
      value: t("homepage.edit.rules.industry.label4"),
    },
    {
      label: t("homepage.edit.rules.industry.label5"),
      value: t("homepage.edit.rules.industry.label5"),
    },
    {
      label: t("homepage.edit.rules.industry.label6"),
      value: t("homepage.edit.rules.industry.label6"),
    },
    {
      label: t("homepage.edit.rules.industry.label7"),
      value: t("homepage.edit.rules.industry.label7"),
    },
  ]);

  const saveInfo = () => {
    startSubmitThrottle();

    ruleFormRef.value?.validate(async (valid: boolean) => {
      if (valid) {
        try {
          deps.isLoading.value = true;
          await userStore.setUserInfo({ info: infoForm.value });
          ElMessage.success(t("homepage.edit.rules.success"));
        } catch {
          ElMessage.error(t("homepage.edit.rules.error1"));
        } finally {
          deps.isLoading.value = false;
        }
      } else {
        ElMessage.error(t("homepage.edit.rules.error2"));
      }
    });
  };

  return {
    ruleFormRef,
    infoForm,
    infoRules,
    industryOptions,
    saveInfo,
  };
};
