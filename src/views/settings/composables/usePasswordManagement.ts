import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance } from "element-plus";
import { useI18n } from "vue-i18n";
import type { Router } from "vue-router";
import { changePassword } from "@/api/v1/password";
import { createPasswordFormRules } from "@/utils/password-validator";

interface UsePasswordManagementDeps {
  checkCurrentEmailVerified: () => Promise<boolean>;
  router: Router;
}

export const usePasswordManagement = (deps: UsePasswordManagementDeps) => {
  const { t } = useI18n();
  const passwordFormRef = ref<FormInstance>();
  const dialogPasswordVisible = ref(false);
  const passwordSubmitting = ref(false);

  const passwordForm = ref({
    oldPassword: null as string | null,
    password: null as string | null,
    checkPassword: null as string | null,
  });

  const passwordRules = computed(() => ({
    oldPassword: [
      {
        required: true,
        message: t("homepage.account.rules2.old.message1"),
        trigger: "blur",
      },
      {
        min: 6,
        message: t("homepage.account.rules2.old.message2"),
        trigger: "blur",
      },
      {
        validator: (
          _rule: unknown,
          value: string,
          callback: (error?: Error) => void
        ) => {
          if (value === "") {
            callback(new Error(t("homepage.account.rules2.old.error1")));
          } else if (value === passwordForm.value.password) {
            callback(new Error(t("homepage.account.rules2.old.error2")));
          } else {
            callback();
          }
        },
        trigger: "blur",
      },
    ],
    password: [
      ...createPasswordFormRules(t),
      {
        validator: (
          _rule: unknown,
          value: string,
          callback: (error?: Error) => void
        ) => {
          if (!value) {
            callback();
            return;
          }
          if (value === passwordForm.value.oldPassword) {
            callback(new Error(t("homepage.account.rules2.new.error2")));
          } else {
            if (passwordForm.value.checkPassword !== "") {
              passwordFormRef.value?.validateField("checkPassword");
            }
            callback();
          }
        },
        trigger: "blur",
      },
    ],
    checkPassword: [
      {
        required: true,
        message: t("homepage.account.rules2.check.message1"),
        trigger: "blur",
      },
      {
        validator: (
          _rule: unknown,
          value: string,
          callback: (error?: Error) => void
        ) => {
          if (value === "") {
            callback(new Error(t("homepage.account.rules2.check.error1")));
          } else if (value !== passwordForm.value.password) {
            callback(new Error(t("homepage.account.rules2.check.error2")));
          } else {
            callback();
          }
        },
        trigger: "blur",
      },
    ],
  }));

  const resetPasswordForm = () => {
    passwordForm.value.oldPassword = null;
    passwordForm.value.password = null;
    passwordForm.value.checkPassword = null;
    passwordFormRef.value?.clearValidate();
  };

  const openPasswordDialog = () => {
    deps.checkCurrentEmailVerified().then((verified) => {
      if (!verified) {
        ElMessage.warning(t("homepage.account.emailNotVerifiedWarning"));
        return;
      }
      dialogPasswordVisible.value = true;
    });
  };

  const submitPasswordChange = () => {
    passwordFormRef.value?.validate(async (valid: boolean) => {
      if (!valid) {
        ElMessage.error(t("homepage.account.validate1.error2"));
        return;
      }
      passwordSubmitting.value = true;
      try {
        const verified = await deps.checkCurrentEmailVerified();
        if (!verified) {
          ElMessage.error(t("homepage.account.emailNotVerifiedWarning"));
          return;
        }
        const response = await changePassword(
          passwordForm.value.oldPassword!,
          passwordForm.value.password!,
          passwordForm.value.checkPassword!
        );
        if (!response.success) {
          ElMessage.error(
            response.error?.message || t("homepage.account.validate1.error1")
          );
          return;
        }
        ElMessage.success(
          response.message || t("homepage.account.validate1.success")
        );
        dialogPasswordVisible.value = false;
        deps.router.push("/site/logout");
      } catch {
        ElMessage.error(t("homepage.account.validate1.error1"));
      } finally {
        passwordSubmitting.value = false;
      }
    });
  };

  return {
    passwordFormRef,
    passwordForm,
    passwordRules,
    dialogPasswordVisible,
    passwordSubmitting,
    resetPasswordForm,
    openPasswordDialog,
    submitPasswordChange,
  };
};
