<template>
  <div class="register-page" :class="{ 'dark-theme': isDark }">
    <img
      class="page-backdrop"
      src="/media/bg/register-spatial-bg.png"
      alt=""
      aria-hidden="true"
    />
    <div class="page-wash"></div>

    <section class="register-shell">
      <aside class="register-story">
        <div class="story-copy">
          <span class="story-kicker">{{ $t("login.registerBadge") }}</span>
          <h1>{{ $t("login.registerHeroTitle") }}</h1>
          <p>{{ $t("login.registerHeroSubtitle") }}</p>
        </div>

        <div class="story-features" aria-label="platform features">
          <span>
            <el-icon><Platform></Platform></el-icon>
            {{ $t("login.registerFeatureWorkspace") }}
          </span>
          <span>
            <el-icon><Box></Box></el-icon>
            {{ $t("login.registerFeatureAssets") }}
          </span>
          <span>
            <el-icon><Connection></Connection></el-icon>
            {{ $t("login.registerFeaturePlugins") }}
          </span>
        </div>
      </aside>

      <div class="register-panel">
        <div class="register-heading">
          <span class="register-eyebrow">
            <el-icon><Cpu></Cpu></el-icon>
            {{ $t("login.registerBadge") }}
          </span>
          <h2>{{ $t("login.createAccount") }}</h2>
          <p>{{ $t("login.registerFormHint") }}</p>
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
              :placeholder="$t('login.username')"
              :suffix-icon="User"
              clearable
            ></el-input>
          </el-form-item>

          <el-form-item :label="$t('login.password')" prop="password">
            <el-input
              v-model="registerForm.password"
              :placeholder="$t('login.password')"
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
              :placeholder="$t('login.repassword')"
              type="password"
              :suffix-icon="Lock"
              show-password
            ></el-input>
          </el-form-item>

          <div class="security-note">
            <el-icon><DataAnalysis></DataAnalysis></el-icon>
            <span>{{ $t("login.registerSecurityHint") }}</span>
          </div>

          <div class="register-actions">
            <el-button
              class="create-action"
              type="primary"
              native-type="button"
              :loading="loading"
              :disabled="loading"
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
import {
  Back,
  Box,
  Connection,
  Cpu,
  DataAnalysis,
  Hide,
  Lock,
  Platform,
  User,
  View,
} from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import "@/assets/font/font.css";
import { LocationQuery, useRoute, useRouter } from "vue-router";
import { Message, MessageBox } from "@/components/Dialog";
import { useSettingsStore } from "@/store/modules/settings";
import { FormInstance, type FormItemRule } from "element-plus";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { computed, onMounted, watch, ref } from "vue";
import { useI18n } from "vue-i18n"; // Ensure you have this import

import { register as wechatRegister } from "@/api/v1/wechat";
import { RegisterData } from "@/api/auth/model";
import { createPasswordFormRules } from "@/utils/password-validator";
import { getWechatRegisterErrorMessages } from "@/utils/wechatRegisterError";
import PasswordStrength from "@/components/PasswordStrength/index.vue";
import authClient from "@/services/auth/authClient";
const { t } = useI18n(); // I18n for translations
const token = computed(() => route.query.token as string);
const settingsStore = useSettingsStore();
const route = useRoute();
const router = useRouter();
const registerFormRef = ref<FormInstance>(); // Separate formRef for register

const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);
const loading = ref(false);

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
      message: t("login.rules.repassword.message1"),
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
      loading.value = true;
      try {
        const response = await wechatRegister({
          username: registerForm.value.username,
          password: registerForm.value.password,
          token: token.value,
        });
        const data = response.data;
        if (data.success) {
          Message.success(t("login.success"));
          authClient.acceptToken(data.token, "register");
          const { path, queryParams } = parseRedirect();
          router.push({ path: path, query: queryParams });
        } else {
          Message.error(t("login.error"));
        }
      } catch (error: unknown) {
        getWechatRegisterErrorMessages(error, t).forEach((msg) =>
          Message.error(msg)
        );
      } finally {
        loading.value = false;
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
.register-page {
  position: relative;
  display: grid;
  box-sizing: border-box;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  padding: clamp(16px, 3vw, 40px);
  overflow: auto;
  font-family:
    "SourceHanSansSC-VF", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #172033;
  background: #edf6f8;
  place-items: center;
  isolation: isolate;
}

.page-backdrop,
.page-wash {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.page-backdrop {
  z-index: -3;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.page-wash {
  z-index: -2;
  background:
    linear-gradient(90deg, rgb(255 255 255 / 20%) 0%, transparent 42%),
    linear-gradient(180deg, rgb(255 255 255 / 24%), rgb(239 248 250 / 38%));
}

.register-shell {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(440px, 0.82fr);
  gap: clamp(28px, 5vw, 84px);
  align-items: center;
  width: min(1280px, 100%);
  min-height: min(780px, calc(100vh - 80px));
  color: #172033;
}

.register-story {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 560px;
  padding: clamp(18px, 3vw, 36px) 0;
  color: #172033;
}

.story-copy {
  max-width: 620px;

  h1 {
    margin: 18px 0 18px;
    font-size: clamp(44px, 5.2vw, 68px);
    font-weight: 750;
    line-height: 1.08;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    font-size: clamp(16px, 1.7vw, 20px);
    line-height: 1.75;
    color: #536276;
  }
}

.story-kicker {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: #087f7a;
  background: rgb(225 249 246 / 74%);
  border: 1px solid rgb(173 222 218 / 72%);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(20 88 102 / 8%);
  backdrop-filter: blur(14px);
}

.story-features {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;

  span {
    display: inline-flex;
    gap: 10px;
    align-items: center;
    min-height: 56px;
    padding: 0 18px;
    font-size: 13px;
    font-weight: 700;
    color: #28384e;
    background: rgb(255 255 255 / 66%);
    border: 1px solid rgb(214 227 235 / 78%);
    border-radius: 28px;
    box-shadow: 0 12px 32px rgb(39 76 92 / 10%);
    backdrop-filter: blur(18px);
  }

  .el-icon {
    font-size: 21px;
    color: #12938d;
  }
}

.register-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(28px, 3.4vw, 44px);
  background: rgb(255 255 255 / 72%);
  border: 1px solid rgb(255 255 255 / 78%);
  border-radius: 8px;
  box-shadow:
    0 24px 70px rgb(48 83 107 / 18%),
    inset 0 1px 0 rgb(255 255 255 / 76%);
  backdrop-filter: blur(22px);
}

.register-heading {
  margin-bottom: 20px;

  h2 {
    margin: 12px 0 10px;
    font-size: clamp(30px, 3vw, 38px);
    font-weight: 760;
    line-height: 1.2;
    color: #172033;
    letter-spacing: 0;
  }

  p {
    max-width: 420px;
    margin: 0;
    font-size: 15px;
    line-height: 1.65;
    color: #66758b;
  }
}

.register-eyebrow {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: #087a75;
  background: #e6f7f3;
  border: 1px solid #c8ebe3;
  border-radius: 8px;
}

.register-form {
  width: 100%;

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    padding: 0 0 9px;
    font-size: 14px;
    font-weight: 700;
    line-height: 20px;
    color: #40516a;
    letter-spacing: 0;
  }

  :deep(.el-input__wrapper) {
    min-height: 48px;
    padding: 0 16px;
    background: rgb(255 255 255 / 78%);
    border-radius: 8px;
    box-shadow: inset 0 0 0 1px #d5e0eb;
    transition:
      box-shadow 0.18s ease,
      background-color 0.18s ease;
  }

  :deep(.el-input__wrapper.is-focus) {
    background: #fbfdff;
    box-shadow:
      inset 0 0 0 1px #149a91,
      0 0 0 3px rgb(20 154 145 / 13%);
  }

  :deep(.el-input__inner) {
    color: #172033;

    &::placeholder {
      color: #a1adbd;
    }
  }

  :deep(.password-strength) {
    width: 100%;
    padding: 12px 14px;
    margin-top: 10px;
    background: rgb(255 255 255 / 52%);
    border: 1px solid #dce6ef;
    border-radius: 8px;
  }

  :deep(.password-strength__rules) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 18px;
    gap: 6px;
  }

  :deep(.password-strength__text) {
    line-height: 1.35;
  }
}

.security-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 0 2px;
  margin-top: -4px;
  font-size: 13px;
  line-height: 1.55;
  color: #65778b;

  .el-icon {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #149a91;
  }
}

.register-actions {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.create-action,
.back-action {
  width: 100%;
  height: 48px;
  border-radius: 8px;
}

.create-action {
  --el-button-bg-color: #109c96;
  --el-button-border-color: #109c96;
  --el-button-hover-bg-color: #0f817b;
  --el-button-hover-border-color: #0f817b;
  --el-button-active-bg-color: #0c736e;
  --el-button-active-border-color: #0c736e;
  --el-button-disabled-bg-color: #89c9c5;
  --el-button-disabled-border-color: #89c9c5;

  font-weight: 700;
  background: #109c96 !important;
  border-color: #109c96 !important;
  box-shadow: 0 14px 28px rgb(16 156 150 / 22%);

  &:hover,
  &:focus {
    background: #0f817b !important;
    border-color: #0f817b !important;
  }
}

.back-action {
  margin-left: 0 !important;
  color: #58677d;
  background: #fff;
  border-color: #dbe5f0;

  &:hover,
  &:focus {
    color: #149a91;
    background: #f7fcfb;
    border-color: #b9ddd8;
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
  border-radius: 8px;

  &:hover,
  &:focus-visible {
    color: #149a91;
    background: #eaf7f5;
    outline: none;
  }
}

.register-page.dark-theme {
  color: #f6f8fb;
  background: #101822;

  .page-backdrop {
    filter: brightness(55%) saturate(92%);
  }

  .page-wash {
    background:
      linear-gradient(90deg, rgb(7 11 20 / 22%) 0%, transparent 42%),
      linear-gradient(180deg, rgb(7 11 20 / 24%), rgb(7 11 20 / 58%));
  }

  .story-copy h1 {
    color: #f7fbff;
  }

  .story-copy p {
    color: #d8e2ed;
  }

  .story-features span {
    color: #eef6ff;
    background: rgb(20 29 40 / 54%);
    border-color: rgb(255 255 255 / 14%);
  }

  .register-panel {
    background: rgb(30 36 47 / 76%);
    border-color: rgb(255 255 255 / 14%);
  }

  .register-heading h2 {
    color: #f6f8fb;
  }

  .register-heading p {
    color: #aab6c8;
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

  .security-note {
    color: #b7c5d7;
  }

  .back-action {
    color: #d1d9e6;
    background: #232936;
    border-color: #3b4658;

    &:hover,
    &:focus {
      color: #a9f5df;
      background: #26353f;
      border-color: #4d827c;
    }
  }
}

@media (max-width: 900px) {
  .register-page {
    align-items: flex-start;
    padding: 16px 16px 56px;
  }

  .register-shell {
    grid-template-columns: 1fr;
    gap: 16px;
    min-height: 0;
  }

  .register-story {
    min-height: auto;
    padding: 24px 6px 6px;
  }

  .story-copy {
    max-width: 560px;

    h1 {
      margin: 12px 0 10px;
      font-size: 34px;
    }

    p {
      font-size: 15px;
    }
  }

  .story-features {
    gap: 8px;
    margin-top: 18px;

    span {
      min-height: 42px;
      padding: 0 12px;
    }
  }

  .register-panel {
    padding: 24px 28px 26px;
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
      min-height: 44px;
    }

    :deep(.password-strength) {
      padding: 7px 10px;
      margin-top: 7px;
    }

    :deep(.password-strength__rules) {
      grid-template-columns: 1fr;
    }
  }

  .register-actions {
    gap: 8px;
    margin-top: 2px;
  }

  .create-action,
  .back-action {
    height: 44px;
  }
}

@media (max-width: 520px) {
  .register-page {
    padding: 12px 12px 56px;
  }

  .register-shell {
    width: 100%;
  }

  .register-story {
    padding: 18px 2px 4px;
  }

  .story-copy h1 {
    font-size: 30px;
  }

  .register-panel {
    padding: 22px 18px;
  }

  .register-heading {
    margin-bottom: 22px;

    h2 {
      font-size: 24px;
    }
  }
}
</style>
