import { ref } from "vue";
import { getEmailStatus } from "@/api/v1/email";
import type { PasswordApiResponse } from "@/api/v1/password";

export type EmailDialogAction = "default" | "bind" | "change" | "unbind";

export const useEmailStatus = () => {
  const emailBound = ref(false);
  const currentBoundEmail = ref("");
  const emailDialogAction = ref<EmailDialogAction>("default");
  const dialogEmailVisible = ref(false);

  const getApiErrorMessage = (
    result: PasswordApiResponse,
    fallback: string
  ): string => {
    return result.error?.message || result.message || fallback;
  };

  const checkCurrentEmailVerified = async (): Promise<boolean> => {
    try {
      const status = await getEmailStatus();
      return Boolean(status.success && status.data?.email_verified);
    } catch {
      return false;
    }
  };

  const getCurrentBoundEmail = async (): Promise<string> => {
    try {
      const status = await getEmailStatus();
      if (!status.success || !status.data?.email) return "";
      return status.data.email;
    } catch {
      return "";
    }
  };

  const refreshEmailStatusSummary = async (): Promise<void> => {
    try {
      const status = await getEmailStatus();
      if (!status.success || !status.data) {
        emailBound.value = false;
        currentBoundEmail.value = "";
        return;
      }
      emailBound.value = Boolean(status.data.email);
      currentBoundEmail.value = status.data.email || "";
    } catch {
      emailBound.value = false;
      currentBoundEmail.value = "";
    }
  };

  const openEmailDialog = (action: EmailDialogAction = "default"): void => {
    emailDialogAction.value = action;
    dialogEmailVisible.value = true;
  };

  return {
    emailBound,
    currentBoundEmail,
    emailDialogAction,
    dialogEmailVisible,
    getApiErrorMessage,
    checkCurrentEmailVerified,
    getCurrentBoundEmail,
    refreshEmailStatusSummary,
    openEmailDialog,
  };
};
