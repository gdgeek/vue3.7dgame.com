<template>
  <el-alert
    v-if="error"
    type="error"
    :closable="false"
    show-icon
    style="margin-bottom: 12px"
  >
    {{ error }}
  </el-alert>

  <el-alert
    v-if="isLocked"
    type="warning"
    :closable="false"
    show-icon
    style="margin-bottom: 12px"
  >
    {{ $t("homepage.edit.accountLocked", { time: lockTime }) }}
  </el-alert>

  <template v-if="step === 'manage'">
    <el-descriptions :column="1" border>
      <el-descriptions-item :label="$t('homepage.edit.currentEmail')">
        <el-tag type="success">{{ currentEmail }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item :label="$t('homepage.edit.verificationStatus')">
        <el-tag :type="isCurrentEmailVerified ? 'success' : 'warning'">
          {{
            isCurrentEmailVerified
              ? $t("homepage.edit.verified")
              : $t("homepage.edit.unverified")
          }}
        </el-tag>
      </el-descriptions-item>
    </el-descriptions>

    <div class="action-row">
      <el-button type="primary" @click="handleStartChange">
        {{
          isCurrentEmailVerified
            ? $t("homepage.edit.changeEmailOrBind")
            : $t("homepage.edit.bindNewEmail")
        }}
      </el-button>
      <el-button type="danger" plain @click="handleStartUnbind">
        {{
          isCurrentEmailVerified
            ? $t("homepage.edit.unbindEmailBtn")
            : $t("homepage.edit.directUnbind")
        }}
      </el-button>
    </div>
  </template>

  <template v-else-if="step === 'change_confirm'">
    <p class="desc-text">{{ $t("homepage.edit.verifyOldEmailFirst") }}</p>
    <el-form
      ref="oldCodeFormRef"
      :model="oldEmailForm"
      :rules="oldCodeRules"
      label-width="auto"
    >
      <el-form-item :label="$t('homepage.edit.oldEmailCode')" prop="code">
        <div class="row-input-btn">
          <el-input
            v-model="oldEmailForm.code"
            maxlength="6"
            :disabled="loading || isLocked"
            :placeholder="$t('homepage.edit.enterSixDigitCode')"
            @input="handleOldCodeInput"
          ></el-input>
          <el-button
            type="primary"
            :disabled="!canSendOldConfirmCode"
            :loading="loading"
            @click="handleSendOldConfirmCode"
          >
            {{ oldConfirmButtonText }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button
          type="success"
          :disabled="!canVerifyOldConfirmCode"
          :loading="loading"
          @click="handleVerifyOldCode"
        >
          {{ $t("homepage.edit.nextStep") }}
        </el-button>
        <el-button @click="cancelCurrentAction">{{
          $t("common.cancel")
        }}</el-button>
      </el-form-item>
    </el-form>
  </template>

  <template v-else-if="step === 'change_verify'">
    <el-alert
      v-if="changeTokenLeft > 0"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    >
      {{ $t("homepage.edit.changeAuthLeft", { seconds: changeTokenLeft }) }}
    </el-alert>

    <p v-else-if="!isCurrentEmailVerified" class="desc-text">
      {{ $t("homepage.edit.bindDirectNoVerify") }}
    </p>

    <el-form
      ref="newEmailFormRef"
      :model="newEmailForm"
      :rules="newEmailRules"
      label-width="auto"
    >
      <el-form-item :label="$t('homepage.edit.email')" prop="email">
        <el-input
          v-model="newEmailForm.email"
          type="email"
          :disabled="loading"
          :placeholder="$t('homepage.edit.emailPlaceholder')"
          @blur="handleCheckCooldown"
        ></el-input>
      </el-form-item>

      <el-form-item :label="$t('homepage.edit.verificationCode')" prop="code">
        <div class="row-input-btn">
          <el-input
            v-model="newEmailForm.code"
            maxlength="6"
            :disabled="loading || isLocked"
            :placeholder="$t('homepage.edit.codePlaceholder')"
            @input="handleNewCodeInput"
          ></el-input>
          <el-button
            type="primary"
            :disabled="!canSendNewCode"
            :loading="loading"
            @click="handleSendNewEmailCode"
          >
            {{ newEmailCodeButtonText }}
          </el-button>
        </div>
      </el-form-item>

      <el-form-item>
        <el-button
          type="success"
          :disabled="!canVerifyNewCode"
          :loading="loading"
          @click="handleVerifyNewEmail"
        >
          {{ $t("homepage.edit.confirmChangeEmail") }}
        </el-button>
        <el-button @click="cancelCurrentAction">{{
          $t("common.cancel")
        }}</el-button>
      </el-form-item>
    </el-form>
  </template>

  <template v-else-if="step === 'unbind_confirm'">
    <p class="desc-text">{{ $t("homepage.edit.verifyBeforeUnbind") }}</p>
    <el-form
      ref="unbindFormRef"
      :model="unbindForm"
      :rules="unbindRules"
      label-width="auto"
    >
      <el-form-item :label="$t('homepage.edit.oldEmailCode')" prop="code">
        <div class="row-input-btn">
          <el-input
            v-model="unbindForm.code"
            maxlength="6"
            :disabled="loading || isLocked"
            :placeholder="$t('homepage.edit.enterSixDigitCode')"
            @input="handleUnbindCodeInput"
          ></el-input>
          <el-button
            type="primary"
            :disabled="!canSendOldConfirmCode"
            :loading="loading"
            @click="handleSendOldConfirmCode"
          >
            {{ oldConfirmButtonText }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button
          type="danger"
          :disabled="!canUnbind"
          :loading="loading"
          @click="handleUnbind"
        >
          {{ $t("homepage.edit.confirmUnbind") }}
        </el-button>
        <el-button @click="cancelCurrentAction">{{
          $t("common.cancel")
        }}</el-button>
      </el-form-item>
    </el-form>
  </template>

  <template v-else-if="step === 'unbind_direct'">
    <p class="desc-text">{{ $t("homepage.edit.unbindDirectNoVerify") }}</p>
    <el-button type="danger" :loading="loading" @click="handleUnbindDirect">
      {{ $t("homepage.edit.confirmDirectUnbind") }}
    </el-button>
    <el-button class="cancel-btn" @click="cancelCurrentAction">
      {{ $t("common.cancel") }}
    </el-button>
  </template>

  <template v-else>
    <el-form
      ref="newEmailFormRef"
      :model="newEmailForm"
      :rules="newEmailRules"
      label-width="auto"
    >
      <el-form-item :label="$t('homepage.edit.email')" prop="email">
        <el-input
          v-model="newEmailForm.email"
          type="email"
          :disabled="loading"
          :placeholder="$t('homepage.edit.emailPlaceholder')"
          @blur="handleCheckCooldown"
        ></el-input>
      </el-form-item>

      <el-form-item :label="$t('homepage.edit.verificationCode')" prop="code">
        <div class="row-input-btn">
          <el-input
            v-model="newEmailForm.code"
            maxlength="6"
            :disabled="loading || isLocked"
            :placeholder="$t('homepage.edit.codePlaceholder')"
            @input="handleNewCodeInput"
          ></el-input>
          <el-button
            type="primary"
            :disabled="!canSendNewCode"
            :loading="loading"
            @click="handleSendNewEmailCode"
          >
            {{ newEmailCodeButtonText }}
          </el-button>
        </div>
      </el-form-item>

      <el-form-item>
        <el-button
          type="success"
          :disabled="!canVerifyNewCode"
          :loading="loading"
          @click="handleVerifyNewEmail"
        >
          {{ $t("homepage.edit.verifyEmail") }}
        </el-button>
      </el-form-item>
    </el-form>
  </template>
</template>

<script setup lang="ts">
import { ElMessage, FormInstance, FormRules } from "element-plus";
import { useEmailVerification } from "@/composables/useEmailVerification";

type InitialAction = "default" | "bind" | "change" | "unbind";

const props = withDefaults(
  defineProps<{
    initialAction?: InitialAction;
  }>(),
  {
    initialAction: "default",
  }
);

const { t } = useI18n();

const newEmailFormRef = ref<FormInstance>();
const oldCodeFormRef = ref<FormInstance>();
const unbindFormRef = ref<FormInstance>();

const {
  loading,
  error,
  step,
  currentEmail,
  isCurrentEmailVerified,
  isLocked,
  lockTime,
  sendCooldown,
  oldConfirmCooldown,
  changeTokenLeft,
  newEmailForm,
  oldEmailForm,
  unbindForm,
  canSendNewCode,
  canVerifyNewCode,
  canSendOldConfirmCode,
  canVerifyOldConfirmCode,
  canUnbind,
  loadStatus,
  refreshSendCooldown,
  sendCodeForNewEmail,
  verifyCodeForNewEmail,
  startChangeFlow,
  sendOldEmailConfirmationCode,
  verifyOldEmailForChange,
  startUnbindFlow,
  unbindCurrentEmail,
  cancelCurrentAction,
  cleanup,
} = useEmailVerification();

const newEmailRules = ref<FormRules<typeof newEmailForm>>({
  email: [
    {
      required: true,
      message: t("homepage.edit.rules.email.required"),
      trigger: "blur",
    },
    {
      type: "email",
      message: t("homepage.edit.rules.email.invalid"),
      trigger: "blur",
    },
  ],
  code: [
    {
      required: true,
      message: t("homepage.edit.rules.code.required"),
      trigger: "blur",
    },
    {
      pattern: /^\d{6}$/,
      message: t("homepage.edit.rules.code.invalid"),
      trigger: "blur",
    },
  ],
});

const oldCodeRules = ref<FormRules<typeof oldEmailForm>>({
  code: [
    {
      required: true,
      message: t("homepage.edit.rules.code.required"),
      trigger: "blur",
    },
    {
      pattern: /^\d{6}$/,
      message: t("homepage.edit.rules.code.invalid"),
      trigger: "blur",
    },
  ],
});

const unbindRules = ref<FormRules<typeof unbindForm>>({
  code: [
    {
      required: true,
      message: t("homepage.edit.rules.code.required"),
      trigger: "blur",
    },
    {
      pattern: /^\d{6}$/,
      message: t("homepage.edit.rules.code.invalid"),
      trigger: "blur",
    },
  ],
});

const newEmailCodeButtonText = computed(() => {
  if (sendCooldown.value > 0) {
    return t("homepage.edit.retryAfterSeconds", {
      seconds: sendCooldown.value,
    });
  }
  return t("homepage.edit.sendCode");
});

const oldConfirmButtonText = computed(() => {
  if (oldConfirmCooldown.value > 0) {
    return t("homepage.edit.retryAfterSeconds", {
      seconds: oldConfirmCooldown.value,
    });
  }
  return t("homepage.edit.sendOldEmailCode");
});

const handleNewCodeInput = (value: string) => {
  newEmailForm.code = value.replace(/\D/g, "").slice(0, 6);
};

const handleOldCodeInput = (value: string) => {
  oldEmailForm.code = value.replace(/\D/g, "").slice(0, 6);
};

const handleUnbindCodeInput = (value: string) => {
  unbindForm.code = value.replace(/\D/g, "").slice(0, 6);
};

const handleCheckCooldown = async () => {
  const email = newEmailForm.email.trim();
  if (!email) {
    return;
  }

  try {
    await newEmailFormRef.value?.validateField("email");
  } catch {
    return;
  }

  await refreshSendCooldown(email);
};

const handleSendNewEmailCode = async () => {
  try {
    await newEmailFormRef.value?.validateField("email");
  } catch {
    return;
  }

  const success = await sendCodeForNewEmail();
  if (success) {
    ElMessage.success(t("emailVerification.codeSent"));
  }
};

const handleVerifyNewEmail = async () => {
  const form = newEmailFormRef.value;
  if (!form) {
    return;
  }

  let validated = false;
  await form.validate((valid: boolean) => {
    validated = valid;
  });

  if (!validated) {
    return;
  }

  const success = await verifyCodeForNewEmail();
  if (success) {
    ElMessage.success(t("emailVerification.verifySuccess"));
  }
};

const handleStartChange = () => {
  startChangeFlow();
};

const handleStartUnbind = () => {
  startUnbindFlow();
};

const handleSendOldConfirmCode = async () => {
  const success = await sendOldEmailConfirmationCode();
  if (success) {
    ElMessage.success(t("emailVerification.sentToCurrentEmail"));
  }
};

const handleVerifyOldCode = async () => {
  const form = oldCodeFormRef.value;
  if (!form) {
    return;
  }

  let validated = false;
  await form.validate((valid: boolean) => {
    validated = valid;
  });

  if (!validated) {
    return;
  }

  const success = await verifyOldEmailForChange();
  if (success) {
    ElMessage.success(t("emailVerification.oldEmailVerified"));
  }
};

const handleUnbind = async () => {
  const form = unbindFormRef.value;
  if (!form) {
    return;
  }

  let validated = false;
  await form.validate((valid: boolean) => {
    validated = valid;
  });

  if (!validated) {
    return;
  }

  const success = await unbindCurrentEmail(unbindForm.code);
  if (success) {
    ElMessage.success(t("emailVerification.unbindSuccess"));
  }
};

const handleUnbindDirect = async () => {
  const success = await unbindCurrentEmail();
  if (success) {
    ElMessage.success(t("emailVerification.unbindSuccess"));
  }
};

const applyInitialAction = () => {
  if (props.initialAction === "change") {
    startChangeFlow();
    return;
  }

  if (props.initialAction === "unbind") {
    startUnbindFlow();
    return;
  }

  if (props.initialAction === "bind" && step.value === "manage") {
    startChangeFlow();
  }
};

onMounted(async () => {
  const loaded = await loadStatus();
  if (loaded && newEmailForm.email) {
    await refreshSendCooldown(newEmailForm.email);
  }
  if (loaded) {
    applyInitialAction();
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<style lang="scss" scoped>
.row-input-btn {
  display: flex;
  gap: 10px;
  width: 100%;
}

.action-row {
  margin-top: 14px;
}

.desc-text {
  color: #606266;
  margin-bottom: 14px;
}
</style>
