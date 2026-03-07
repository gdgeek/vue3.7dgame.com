import { ref } from "vue";
import type { Ref } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormItemRule } from "element-plus";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/store/modules/user";
import { useSubmitThrottle } from "./useSubmitThrottle";

interface UseNicknameFormDeps {
  isLoading: Ref<boolean>;
  isDisable: Ref<boolean>;
}

type NickNameType = { nickname: string };
type Arrayable<T> = T | T[];

export const useNicknameForm = (deps: UseNicknameFormDeps) => {
  const { t } = useI18n();
  const userStore = useUserStore();
  const nickNameFormRef = ref<FormInstance>();
  const nicknameForm = ref<NickNameType>({ nickname: "" });
  const { startSubmitThrottle } = useSubmitThrottle({
    isDisable: deps.isDisable,
  });

  const nicknameRules: Partial<Record<string, Arrayable<FormItemRule>>> = {
    nickname: [
      {
        required: true,
        message: t("homepage.edit.rules.nickname.message1"),
        trigger: "blur",
      },
      {
        min: 2,
        message: t("homepage.edit.rules.nickname.message2"),
        trigger: "blur",
      },
      {
        validator: (
          _rule: unknown,
          value: string,
          callback: (error?: Error) => void
        ) => {
          if (value === "") {
            callback(new Error(t("homepage.edit.rules.nickname.error1")));
          } else if (!/^[\u4e00-\u9fa5_a-zA-Z0-9-]+$/.test(value)) {
            callback(new Error(t("homepage.edit.rules.nickname.error2")));
          } else {
            callback();
          }
        },
        trigger: "blur",
      },
    ],
  };

  const submitNickname = async () => {
    startSubmitThrottle();

    nickNameFormRef.value?.validate(async (valid: boolean) => {
      if (valid) {
        try {
          deps.isLoading.value = true;
          await userStore.setUserInfo({ nickname: nicknameForm.value.nickname });
          ElMessage.success(t("homepage.edit.rules.nickname.success"));
        } catch {
          ElMessage.error(t("homepage.edit.rules.nickname.error3"));
        } finally {
          deps.isLoading.value = false;
        }
      } else {
        ElMessage.error(t("homepage.edit.rules.nickname.error4"));
      }
    });
  };

  return {
    nickNameFormRef,
    nicknameForm,
    nicknameRules,
    submitNickname,
  };
};
