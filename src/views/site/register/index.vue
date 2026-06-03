<template>
  <div class="content">
    <section :class="['register-shell', { 'dark-theme': isDark }]">
      <aside class="register-visual" aria-hidden="true">
        <div class="visual-copy">
          <h1>{{ $t("login.h1") }}</h1>
          <p>{{ $t("login.h4") }}</p>
        </div>
        <div class="visual-panel">
          <div class="visual-panel__grid"></div>
          <div class="visual-panel__track visual-panel__track--one"></div>
          <div class="visual-panel__track visual-panel__track--two"></div>
          <div class="visual-panel__node visual-panel__node--one"></div>
          <div class="visual-panel__node visual-panel__node--two"></div>
          <div class="visual-panel__node visual-panel__node--three"></div>
        </div>
      </aside>

      <div class="register-panel">
        <div class="register-heading">
          <span class="register-eyebrow">{{ $t("login.register") }}</span>
          <h2>{{ $t("login.createAccount") }}</h2>
        </div>

        <el-form
          ref="registerFormRef"
          class="register-form"
          :rules="registerRules"
          :model="registerForm"
          label-position="top"
        >
          <el-form-item :label="$t('login.username')" prop="username">
            <el-input
              v-model="registerForm.username"
              :suffix-icon="User"
            ></el-input>
          </el-form-item>

          <el-form-item :label="$t('login.password')" prop="password">
            <el-input
              v-model="registerForm.password"
              :type="passwordVisible ? 'text' : 'password'"
            >
              <template #suffix>
                <button
                  type="button"
                  class="password-visibility-toggle"
                  :aria-label="
                    passwordVisible
                      ? $t('login.hidePassword')
                      : $t('login.showPassword')
                  "
                  :title="
                    passwordVisible
                      ? $t('login.hidePassword')
                      : $t('login.showPassword')
                  "
                  @mousedown.prevent
                  @click="togglePasswordVisibility"
                >
                  <el-icon>
                    <Hide v-if="passwordVisible"></Hide>
                    <View v-else></View>
                  </el-icon>
                </button>
              </template>
            </el-input>
            <PasswordStrength
              :password="registerForm.password"
              :account-identifiers="[registerForm.username]"
            ></PasswordStrength>
          </el-form-item>

          <el-form-item :label="$t('login.repassword')" prop="repassword">
            <el-input
              v-model="registerForm.repassword"
              type="password"
              :suffix-icon="Lock"
            ></el-input>
          </el-form-item>

          <div class="register-actions">
            <el-button
              class="create-action"
              type="primary"
              native-type="button"
              @click="register"
            >
              {{ $t("login.create") }}
            </el-button>
            <el-button class="back-action" native-type="button" @click="back">
              <el-icon>
                <Back></Back>
              </el-icon>
              {{ $t("login.back") }}
            </el-button>
          </div>
        </el-form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Back, Hide, Lock, User, View } from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import "@/assets/font/font.css";
import { LocationQuery, useRoute, useRouter } from "vue-router";
import { Message, MessageBox } from "@/components/Dialog";
import { useSettingsStore } from "@/store/modules/settings";
import { FormInstance, type FormItemRule } from "element-plus";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { onMounted, watch, ref } from "vue";
import { useI18n } from "vue-i18n"; // Ensure you have this import

import { register as wechatRegister } from "@/api/v1/wechat";
import { RegisterData } from "@/api/auth/model";
import Token from "@/store/modules/token";
import { createPasswordFormRules } from "@/utils/password-validator";
import PasswordStrength from "@/components/PasswordStrength/index.vue";
const { t } = useI18n(); // I18n for translations
const token = computed(() => route.query.token as string);
const settingsStore = useSettingsStore();
const route = useRoute();
const router = useRouter();
const registerFormRef = ref<FormInstance>(); // Separate formRef for register

const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);

const back = async () => {
  try {
    await MessageBox.confirm(
      t("login.abandonRegisterConfirm"),
      t("login.abandonRegisterTitle"),
      {
        confirmButtonText: t("login.abandonRegisterConfirmButton"),
        cancelButtonText: t("login.abandonRegisterCancelButton"),
        type: "warning",
      }
    );
    router.push("/site/login");
  } catch (e) {
    logger.error(e);
  }
};
const registerForm = ref<RegisterData>({
  username: "",
  password: "",
  repassword: "",
});
const passwordVisible = ref(false);

const togglePasswordVisibility = () => {
  passwordVisible.value = !passwordVisible.value;
};

const validatePass2: FormItemRule["validator"] = (_rule, value, callback) => {
  if (value === "") {
    callback(new Error(t("login.rules.repassword.message1")));
  } else if (value !== registerForm.value.password) {
    callback(new Error(t("login.rules.repassword.message2")));
  } else {
    callback();
  }
};
const registerRules = computed(() => ({
  username: [
    {
      required: true,
      message: t("login.rules.username.message1"),
      trigger: "blur",
    },
  ],
  password: createPasswordFormRules(t, () => ({
    accountIdentifiers: [registerForm.value.username],
  })),
  repassword: [
    {
      required: true,
      message: t("login.rules.password.message1"),
      trigger: "blur",
    },
    { validator: validatePass2, trigger: "blur" },
  ],
}));

function parseRedirect(): {
  path: string;
  queryParams: Record<string, string>;
} {
  const query: LocationQuery = route.query;
  const redirect = (query.redirect as string) ?? "/home/index";

  const url = new URL(redirect, window.location.origin);
  const path = url.pathname;
  const queryParams: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  return { path, queryParams };
}

const register = async () => {
  registerFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const response = await wechatRegister({
          username: registerForm.value.username,
          password: registerForm.value.password,
          token: token.value,
        });
        const data = response.data;
        if (data.success) {
          Message.success(t("login.success"));
          Token.setToken(data.token);
          const { path, queryParams } = parseRedirect();
          router.push({ path: path, query: queryParams });
        } else {
          Message.error(t("login.error"));
        }
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { password?: string[]; message?: string } };
        };
        const passwordErrors = axiosError?.response?.data?.password;
        if (Array.isArray(passwordErrors)) {
          passwordErrors.forEach((msg: string) => Message.error(msg));
        } else {
          Message.error(
            axiosError?.response?.data?.message || t("login.error")
          );
        }
      }
    } else {
      Message.error(t("login.error"));
    }
  });
};

// Automatically toggle dark theme on mount
onMounted(() => {
  document.body.classList.toggle("dark-theme", isDark.value);
});

// Watch for theme change
watch(isDark, (newValue) => {
  document.body.classList.toggle("dark-theme", newValue);
});
</script>

<style scoped lang="scss">
.content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: clamp(18px, 4vw, 48px);
  overflow: auto;
  background:
    linear-gradient(135deg, rgb(236 246 255 / 92%), rgb(246 251 248 / 88%)),
    url("/media/bg/02.jpg") center / cover no-repeat;
}

.register-shell {
  display: grid;
  grid-template-columns: minmax(360px, 1.05fr) minmax(390px, 0.95fr);
  width: min(1080px, 100%);
  min-height: 620px;
  overflow: hidden;
  color: #172033;
  background: rgb(255 255 255 / 94%);
  border: 1px solid rgb(177 194 219 / 45%);
  border-radius: 8px;
  box-shadow: 0 24px 70px rgb(27 56 94 / 18%);
}

.register-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  padding: clamp(34px, 4vw, 54px);
  overflow: hidden;
  color: #fff;
  isolation: isolate;

  &::before,
  &::after {
    position: absolute;
    inset: 0;
    content: "";
  }

  &::before {
    z-index: -2;
    background: url("/media/bg/02.jpg") center / cover no-repeat;
    transform: scale(1.04);
  }

  &::after {
    z-index: -1;
    background:
      linear-gradient(135deg, rgb(18 45 84 / 92%), rgb(28 116 145 / 70%)),
      linear-gradient(180deg, transparent, rgb(6 18 34 / 38%));
  }
}

.visual-copy {
  max-width: 420px;

  h1 {
    margin: 0 0 14px;
    font-size: clamp(38px, 5vw, 58px);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    font-size: 20px;
    line-height: 1.6;
    color: rgb(238 248 255 / 86%);
  }
}

.visual-panel {
  position: relative;
  width: min(360px, 100%);
  aspect-ratio: 1.55;
  overflow: hidden;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 18%);
  backdrop-filter: blur(8px);
}

.visual-panel__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(255 255 255 / 12%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 12%) 1px, transparent 1px);
  background-size: 34px 34px;
}

.visual-panel__track,
.visual-panel__node {
  position: absolute;
}

.visual-panel__track {
  height: 2px;
  background: linear-gradient(90deg, #a8f0d3, #90c7ff, #ffd166);
  border-radius: 2px;
  transform-origin: left center;
}

.visual-panel__track--one {
  top: 42%;
  left: 18%;
  width: 58%;
  transform: rotate(-18deg);
}

.visual-panel__track--two {
  top: 58%;
  left: 27%;
  width: 48%;
  transform: rotate(22deg);
}

.visual-panel__node {
  width: 34px;
  height: 34px;
  background: rgb(255 255 255 / 18%);
  border: 1px solid rgb(255 255 255 / 32%);
  border-radius: 6px;
  box-shadow: 0 12px 28px rgb(0 0 0 / 16%);
}

.visual-panel__node--one {
  top: 24%;
  left: 15%;
  background: rgb(168 240 211 / 32%);
}

.visual-panel__node--two {
  top: 46%;
  right: 18%;
  background: rgb(144 199 255 / 30%);
}

.visual-panel__node--three {
  right: 30%;
  bottom: 16%;
  background: rgb(255 209 102 / 32%);
}

.register-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(36px, 4.5vw, 58px);
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 96%),
    rgb(249 252 255 / 96%)
  );
}

.register-heading {
  margin-bottom: 28px;

  h2 {
    margin: 10px 0 0;
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    color: #172033;
    letter-spacing: 0;
  }
}

.register-eyebrow {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: #116d7f;
  background: #e7f7f5;
  border: 1px solid #cdecea;
  border-radius: 6px;
}

.register-form {
  width: 100%;

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-form-item__label) {
    padding: 0 0 8px;
    font-size: 14px;
    font-weight: 650;
    line-height: 20px;
    color: #4a5a72;
    letter-spacing: 0;
  }

  :deep(.el-input__wrapper) {
    min-height: 48px;
    padding: 0 14px;
    background: #fff;
    border-radius: 6px;
    box-shadow: inset 0 0 0 1px #dbe5f0;
    transition:
      box-shadow 0.18s ease,
      background-color 0.18s ease;
  }

  :deep(.el-input__wrapper.is-focus) {
    background: #fbfdff;
    box-shadow:
      inset 0 0 0 1px #2474e8,
      0 0 0 3px rgb(36 116 232 / 12%);
  }

  :deep(.el-input__inner) {
    color: #172033;
  }

  :deep(.password-strength) {
    width: 100%;
    padding: 10px 12px;
    margin-top: 10px;
    background: #f6f9fc;
    border: 1px solid #e2eaf3;
    border-radius: 6px;
  }

  :deep(.password-strength__text) {
    line-height: 1.35;
  }
}

.register-actions {
  display: grid;
  gap: 10px;
  margin-top: 6px;
}

.create-action,
.back-action {
  width: 100%;
  height: 46px;
  border-radius: 6px;
}

.create-action {
  font-weight: 700;
  background: #2474e8;
  border-color: #2474e8;
  box-shadow: 0 12px 26px rgb(36 116 232 / 22%);

  &:hover,
  &:focus {
    background: #1f66cc;
    border-color: #1f66cc;
  }
}

.back-action {
  margin-left: 0 !important;
  color: #58677d;
  background: #fff;
  border-color: #dbe5f0;

  &:hover,
  &:focus {
    color: #2474e8;
    background: #f7fbff;
    border-color: #bcd4f5;
  }
}

.password-visibility-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: #7c8aa0;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;

  &:hover,
  &:focus-visible {
    color: #2474e8;
    background: #eef6ff;
    outline: none;
  }
}

.register-shell.dark-theme {
  color: #f6f8fb;
  background: rgb(26 30 38 / 94%);
  border-color: rgb(255 255 255 / 12%);
  box-shadow: 0 24px 70px rgb(0 0 0 / 32%);

  .register-panel {
    background: linear-gradient(
      180deg,
      rgb(34 39 49 / 98%),
      rgb(28 33 42 / 98%)
    );
  }

  .register-heading h2 {
    color: #f6f8fb;
  }

  .register-eyebrow {
    color: #a9f5df;
    background: rgb(32 126 145 / 16%);
    border-color: rgb(169 245 223 / 24%);
  }

  .register-form {
    :deep(.el-form-item__label) {
      color: #c4cfdd;
    }

    :deep(.el-input__wrapper) {
      background: #232936;
      box-shadow: inset 0 0 0 1px #3b4658;
    }

    :deep(.el-input__wrapper.is-focus) {
      background: #252d3b;
      box-shadow:
        inset 0 0 0 1px #68a7ff,
        0 0 0 3px rgb(104 167 255 / 14%);
    }

    :deep(.el-input__inner) {
      color: #f6f8fb;
    }

    :deep(.password-strength) {
      background: #202735;
      border-color: #364254;
    }
  }

  .back-action {
    color: #d1d9e6;
    background: #232936;
    border-color: #3b4658;

    &:hover,
    &:focus {
      color: #8fc3ff;
      background: #263246;
      border-color: #577aa9;
    }
  }
}

@media (max-width: 900px) {
  .content {
    align-items: flex-start;
    padding: 18px;
  }

  .register-shell {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .register-visual {
    min-height: 108px;
    padding: 18px 28px;
  }

  .visual-copy h1 {
    margin-bottom: 8px;
    font-size: 28px;
  }

  .visual-copy p {
    font-size: 14px;
  }

  .visual-panel {
    display: none;
  }

  .register-panel {
    padding: 22px 28px 24px;
  }

  .register-heading {
    margin-bottom: 14px;

    h2 {
      font-size: 26px;
    }
  }

  .register-form {
    :deep(.el-form-item) {
      margin-bottom: 12px;
    }

    :deep(.el-input__wrapper) {
      min-height: 42px;
    }

    :deep(.password-strength) {
      padding: 7px 10px;
      margin-top: 7px;
    }
  }

  .register-actions {
    gap: 8px;
    margin-top: 2px;
  }

  .create-action,
  .back-action {
    height: 42px;
  }
}

@media (max-width: 520px) {
  .content {
    padding: 12px;
  }

  .register-shell {
    width: 100%;
  }

  .register-visual {
    min-height: 108px;
    padding: 18px 22px;
  }

  .register-panel {
    padding: 22px;
  }

  .register-heading {
    margin-bottom: 22px;

    h2 {
      font-size: 24px;
    }
  }
}
</style>
