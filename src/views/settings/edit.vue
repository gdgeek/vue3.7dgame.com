<template>
  <TransitionWrapper>
    <div>
      <br />
      <el-card v-loading="isLoading" class="box-card">
        <!-- 个人资料标题和返回按钮 -->
        <el-row>
          <el-col>
            <div class="box-title">
              <h3 class="font-color">{{ $t("homepage.edit.personalData") }}</h3>
              <small>{{ $t("homepage.edit.personalDataStatement") }}</small>
            </div>
          </el-col>
          <el-col align="right">
            <span>
              <router-link to="/home/index">
                <el-button size="small">{{
                  $t("homepage.edit.return")
                }}</el-button>
              </router-link>
            </span>
          </el-col>
        </el-row>

        <el-divider></el-divider>

        <!-- 用户昵称和头像部分 -->
        <div class="box-title box-margin-bottom">
          <h3 class="font-color">{{ $t("homepage.edit.userNickname") }}</h3>
          <small>{{ $t("homepage.edit.userNicknameStatement") }}</small>
        </div>

        <el-row :gutter="24">
          <el-col
            :xs="23"
            :sm="16"
            :md="14"
            :lg="12"
            :xl="10"
            class="section-margin-left"
          >
            <el-form
              ref="nickNameFormRef"
              :model="nicknameForm"
              :rules="nicknameRules"
              label-width="auto"
            >
              <!-- 昵称输入框 -->
              <el-form-item
                :label="$t('homepage.edit.nickname')"
                prop="nickname"
                style="margin-bottom: 26px"
              >
                <el-input
                  v-model="nicknameForm.nickname"
                  style="width: 100%"
                  :placeholder="$t('homepage.edit.nickname')"
                  autocomplete="off"
                  @keyup.enter="submitNickname"
                >
                  <template #suffix>
                    <el-button
                      style="margin-right: -10px"
                      :disabled="isDisable"
                      @click="submitNickname"
                    >
                      {{ $t("homepage.edit.confirm") }}
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>

              <!-- 头像上传 -->
              <el-form-item :label="$t('homepage.edit.avatar')">
                <ImageSelector
                  :image-url="imageUrl"
                  :enable-crop="true"
                  @image-selected="handleAvatarImageUpdate"
                  @image-upload-success="handleAvatarImageUpdate"
                ></ImageSelector>
                <div style="float: left">
                  <p class="user-explain">
                    {{ $t("homepage.edit.avatarStatement") }}
                  </p>
                </div>
              </el-form-item>
            </el-form>
          </el-col>
        </el-row>

        <el-divider></el-divider>

        <!-- 用户基本信息部分 -->
        <div class="box-title box-margin-bottom">
          <h3 class="font-color">{{ $t("homepage.edit.basicInformation") }}</h3>
          <small style="line-height: 16px">
            {{ $t("homepage.edit.basicInformationStatement") }}
          </small>
        </div>

        <el-row :gutter="24">
          <el-col
            :xs="23"
            :sm="16"
            :md="14"
            :lg="12"
            :xl="10"
            class="box-margin-bottom"
          >
            <el-form
              ref="ruleFormRef"
              :model="infoForm"
              :rules="infoRules"
              label-width="auto"
            >
              <!-- 性别选择 -->
              <el-form-item :label="$t('homepage.edit.gender')">
                <el-radio-group v-model="infoForm.sex">
                  <el-radio-button label="man" value="man">
                    <el-icon>
                      <Male></Male>
                    </el-icon>
                    {{ $t("homepage.edit.man") }}
                  </el-radio-button>
                  <el-radio-button label="woman" value="woman">
                    <el-icon>
                      <Female></Female>
                    </el-icon>
                    {{ $t("homepage.edit.woman") }}
                  </el-radio-button>
                </el-radio-group>
              </el-form-item>

              <!-- 行业选择 -->
              <el-form-item
                :label="$t('homepage.edit.industry')"
                prop="industry"
              >
                <el-select
                  v-model="infoForm.industry"
                  style="width: 100%"
                  :placeholder="$t('homepage.edit.industryStatement')"
                >
                  <el-option
                    v-for="item in industryOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-select>
              </el-form-item>
              <!-- <el-form-item
              :label="$t('homepage.edit.placeOfAbode')"
              prop="selectedOptions"
            >
              <el-cascader
                v-model="infoForm.selectedOptions"
                size="large"
                :options="addressOptions"
                style="width: 100%"
                @change="handleChange"
              ></el-cascader>
            </el-form-item> -->

              <!-- 个人简介 -->
              <el-form-item
                :label="$t('homepage.edit.individualResume')"
                prop="textarea"
              >
                <el-input
                  v-model="infoForm.textarea"
                  style="width: 100%"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 10 }"
                  :placeholder="$t('homepage.edit.individualResumeStatement')"
                ></el-input>
              </el-form-item>

              <!-- 保存按钮 -->
              <el-form-item>
                <el-button
                  type="primary"
                  style="width: 150px"
                  :disabled="isDisable"
                  @click="saveInfo"
                >
                  {{ $t("homepage.edit.save") }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-col>
        </el-row>

        <el-divider></el-divider>

        <!-- 账号安全部分 -->
        <div class="box-title box-margin-bottom">
          <h3 class="font-color">{{ $t("breadcrumb.accountSecurity") }}</h3>
          <small>{{ $t("homepage.account.titleStatement") }}</small>
        </div>

        <el-row :gutter="24">
          <el-col
            :xs="23"
            :sm="16"
            :md="14"
            :lg="12"
            :xl="10"
            class="section-margin-left box-margin-bottom"
          >
            <div class="security-action-card">
              <div class="security-main">
                <p class="security-title">
                  {{ $t("homepage.account.securityEmailTitle") }}
                </p>
                <p class="security-subtitle">
                  {{
                    emailBound
                      ? $t("homepage.account.securityEmailBoundHint")
                      : $t("homepage.account.securityEmailUnboundHint")
                  }}
                </p>
                <el-tag v-if="emailBound" type="success" class="email-pill">
                  {{ currentBoundEmail }}
                </el-tag>
              </div>
              <div class="security-actions">
                <template v-if="emailBound">
                  <el-button type="primary" @click="openEmailDialog('change')">
                    {{ $t("homepage.account.changeEmailAction") }}
                  </el-button>
                  <el-button
                    type="danger"
                    plain
                    @click="openEmailDialog('unbind')"
                  >
                    {{ $t("homepage.account.unbindEmailAction") }}
                  </el-button>
                </template>
                <template v-else>
                  <el-button type="primary" @click="openEmailDialog('bind')">
                    {{ $t("homepage.account.bindEmailAction") }}
                  </el-button>
                </template>
              </div>
            </div>
          </el-col>
          <el-col
            :xs="23"
            :sm="16"
            :md="14"
            :lg="12"
            :xl="10"
            class="section-margin-left box-margin-bottom"
          >
            <div class="security-action-card">
              <div class="security-main">
                <p class="security-title">
                  {{ $t("homepage.account.securityPasswordTitle") }}
                </p>
                <p class="security-subtitle">
                  {{ $t("homepage.account.securityPasswordHint") }}
                </p>
              </div>
              <div class="security-actions">
                <el-button type="primary" @click="openPasswordDialog">
                  {{ $t("homepage.account.change") }}
                </el-button>
                <el-button type="primary" @click="openRecoverDialog">
                  {{ $t("homepage.account.recover") }}
                </el-button>
              </div>
            </div>
          </el-col>
        </el-row>

        <el-dialog
          v-model="dialogEmailVisible"
          :close-on-click-modal="false"
          destroy-on-close
          style="min-width: 560px"
          @closed="refreshEmailStatusSummary"
        >
          <template #header>
            {{ $t("homepage.edit.emailVerification") }}
          </template>
          <EmailVerificationPanel
            :initial-action="emailDialogAction"
          ></EmailVerificationPanel>
        </el-dialog>

        <el-dialog
          v-model="dialogPasswordVisible"
          :close-on-click-modal="false"
          style="min-width: 560px"
          @close="resetPasswordForm"
        >
          <template #header> {{ $t("homepage.account.change") }} </template>
          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="auto"
          >
            <el-row :gutter="24">
              <el-col :xs="20" :sm="20" :md="14" :lg="14" :xl="14" :offset="4">
                <el-form-item
                  :label="$t('homepage.account.label3')"
                  prop="oldPassword"
                  style="margin-bottom: 26px"
                >
                  <el-input
                    v-model="passwordForm.oldPassword"
                    type="password"
                    autocomplete="off"
                  ></el-input>
                </el-form-item>

                <el-form-item
                  :label="$t('homepage.account.label4')"
                  prop="password"
                  style="margin-bottom: 26px"
                >
                  <el-input
                    v-model="passwordForm.password"
                    type="password"
                    autocomplete="off"
                    show-password
                  ></el-input>
                  <PasswordStrength
                    :password="passwordForm.password ?? ''"
                  ></PasswordStrength>
                </el-form-item>

                <el-form-item
                  :label="$t('homepage.account.label5')"
                  prop="checkPassword"
                  style="margin-bottom: 26px"
                >
                  <el-input
                    v-model="passwordForm.checkPassword"
                    type="password"
                    autocomplete="off"
                    show-password
                  ></el-input>
                </el-form-item>

                <el-form-item>
                  <el-button
                    style="width: 100%"
                    type="primary"
                    :loading="passwordSubmitting"
                    @click="submitPasswordChange"
                  >
                    {{ $t("homepage.account.confirm") }}
                  </el-button>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-dialog>

        <el-dialog
          v-model="dialogRecoverVisible"
          :close-on-click-modal="false"
          style="min-width: 560px"
          @close="resetRecoverForm"
        >
          <template #header> {{ $t("homepage.account.recover") }} </template>
          <p class="recover-tip">{{ $t("login.forgotTipBoundEmail") }}</p>
          <el-form
            ref="recoverFormRef"
            :model="recoverForm"
            :rules="recoverRules"
            label-width="auto"
          >
            <el-row :gutter="24">
              <el-col :xs="20" :sm="20" :md="14" :lg="14" :xl="14" :offset="4">
                <el-form-item :label="$t('homepage.account.label1')">
                  <span>{{ recoverForm.email }}</span>
                </el-form-item>

                <el-form-item>
                  <el-button
                    style="width: 100%"
                    :loading="recoverSending"
                    :disabled="!canSendRecoverCode"
                    @click="handleRecoverSendEmail"
                  >
                    {{ recoverSendButtonText }}
                  </el-button>
                </el-form-item>

                <el-form-item :label="$t('login.forgotTokenLabel')" prop="code">
                  <el-input
                    v-model="recoverForm.code"
                    :placeholder="$t('login.forgotTokenPlaceholder')"
                  >
                    <template #append>
                      <el-button
                        :loading="recoverVerifying"
                        @click="handleRecoverVerifyCode"
                      >
                        {{ $t("login.verifyResetToken") }}
                      </el-button>
                    </template>
                  </el-input>
                </el-form-item>

                <template v-if="recoverCodeVerified">
                  <el-form-item
                    :label="$t('homepage.account.label4')"
                    prop="password"
                  >
                    <el-input
                      v-model="recoverForm.password"
                      type="password"
                      autocomplete="off"
                      show-password
                    ></el-input>
                    <PasswordStrength
                      :password="recoverForm.password ?? ''"
                    ></PasswordStrength>
                  </el-form-item>

                  <el-form-item
                    :label="$t('homepage.account.label5')"
                    prop="checkPassword"
                  >
                    <el-input
                      v-model="recoverForm.checkPassword"
                      type="password"
                      autocomplete="off"
                      show-password
                    ></el-input>
                  </el-form-item>
                </template>
              </el-col>
            </el-row>
          </el-form>
          <template #footer>
            <el-button @click="dialogRecoverVisible = false">
              {{ $t("login.cancel") }}
            </el-button>
            <el-button
              class="recover-reset-btn"
              type="primary"
              :disabled="!canRecoverResetPassword"
              :loading="recoverResetting"
              @click="handleRecoverResetPassword"
            >
              {{ $t("login.resetPassword") }}
            </el-button>
          </template>
        </el-dialog>
      </el-card>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useUserStore } from "@/store/modules/user";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { ElMessage } from "element-plus";
import PasswordStrength from "@/components/PasswordStrength/index.vue";
import { useRouter } from "vue-router";
import EmailVerificationPanel from "@/components/Account/EmailVerificationPanel.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import { useEmailStatus } from "./composables/useEmailStatus";
import { useNicknameForm } from "./composables/useNicknameForm";
import { useBasicInfoForm } from "./composables/useBasicInfoForm";
import { usePasswordManagement } from "./composables/usePasswordManagement";
import { useRecoverPassword } from "./composables/useRecoverPassword";

// --- Shared state ---
const { t } = useI18n();
const userStore = useUserStore();
const router = useRouter();
const isLoading = ref(true);
const isDisable = ref(false);

// --- Email status composable ---
const {
  emailBound,
  currentBoundEmail,
  emailDialogAction,
  dialogEmailVisible,
  getApiErrorMessage,
  checkCurrentEmailVerified,
  getCurrentBoundEmail,
  refreshEmailStatusSummary,
  openEmailDialog,
} = useEmailStatus();

// --- Nickname form composable ---
const { nickNameFormRef, nicknameForm, nicknameRules, submitNickname } =
  useNicknameForm({ isLoading, isDisable });

// --- Basic info form composable ---
const { ruleFormRef, infoForm, infoRules, industryOptions, saveInfo } =
  useBasicInfoForm({ isLoading, isDisable });

// --- Password management composable ---
const {
  passwordFormRef,
  passwordForm,
  passwordRules,
  dialogPasswordVisible,
  passwordSubmitting,
  resetPasswordForm,
  openPasswordDialog,
  submitPasswordChange,
} = usePasswordManagement({ checkCurrentEmailVerified, router });

// --- Password recovery composable ---
const {
  recoverFormRef,
  recoverForm,
  recoverRules,
  dialogRecoverVisible,
  recoverSending,
  recoverVerifying,
  recoverResetting,
  recoverCodeVerified,
  recoverCooldownSeconds,
  canSendRecoverCode,
  canRecoverResetPassword,
  recoverSendButtonText,
  stopRecoverCooldown,
  openRecoverDialog,
  resetRecoverForm,
  handleRecoverSendEmail,
  handleRecoverVerifyCode,
  handleRecoverResetPassword,
} = useRecoverPassword({ getCurrentBoundEmail, getApiErrorMessage, openEmailDialog, router });

// --- Avatar image URL (derived from user store) ---
const imageUrl = computed(() => {
  if (
    userStore.userInfo == null ||
    userStore.userInfo.userInfo == null ||
    !userStore.userInfo.userInfo.avatar
  ) {
    return "";
  }
  return userStore.userInfo.userInfo.avatar.url;
});

// --- Avatar upload handler ---
const handleAvatarImageUpdate = async (payload: {
  imageId: number;
  itemId: number | null;
  imageUrl?: string;
}): Promise<void> => {
  if (!payload.imageId) {
    ElMessage.error(t("homepage.edit.avatarCropping.error3"));
    return;
  }
  try {
    isLoading.value = true;
    await userStore.setUserInfo({ avatar_id: payload.imageId });
    ElMessage.success(t("homepage.edit.avatarCropping.success"));
  } catch {
    ElMessage.error(t("homepage.edit.rules.error1"));
  } finally {
    isLoading.value = false;
  }
};

// --- Lifecycle ---
onMounted(() => {
  refreshEmailStatusSummary();
});

// Sync form fields whenever the user store updates
watch(
  () => userStore.userInfo,
  (newUserInfo) => {
    if (newUserInfo == null || newUserInfo.id === 0) {
      return;
    }

    const parsedInfo = newUserInfo.userInfo?.info;
    nicknameForm.value.nickname = newUserInfo.userData?.nickname || "";

    if (parsedInfo) {
      infoForm.value.sex = parsedInfo.sex || "";
      infoForm.value.industry = parsedInfo.industry || "";
      infoForm.value.selectedOptions = parsedInfo.selectedOptions || [];
      infoForm.value.textarea = parsedInfo.textarea || "";
    }

    isLoading.value = false;
  },
  { deep: true, immediate: true }
);
</script>

<style lang="scss" scoped>
/* 响应式布局样式 */
@media screen and (min-width: 900px) {
  .section-margin-left {
    margin-left: 12%;
  }
}

/* 卡片样式 */
.box-card {
  margin: 1.6% 1.6% 0.6%;
}

/* 标题区块样式 */
.box-title {
  line-height: 10px;
  padding: 2px 0;
  margin-left: 1%;

  small {
    color: #6f6f6f;
  }
}

.box-margin-bottom {
  margin-bottom: 28px;
}

.font-color {
  font-weight: 500;
}

.security-action-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fafcff;
  padding: 16px;
}

.security-main {
  min-width: 0;
}

.security-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.security-subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}

.email-pill {
  margin-top: 10px;
}

.security-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media screen and (max-width: 768px) {
  .security-action-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .security-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

.recover-tip {
  margin: 0 0 12px;
  color: #6f6f6f;
  font-size: 13px;
}

.recover-reset-btn {
  min-width: 120px;
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.recover-reset-btn:not(.is-disabled) {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #fff !important;
  box-shadow: 0 6px 14px rgba(64, 158, 255, 0.24);
}

.recover-reset-btn:not(.is-disabled):hover,
.recover-reset-btn:not(.is-disabled):focus-visible {
  background-color: #5aafff !important;
  border-color: #5aafff !important;
  color: #fff !important;
}

.recover-reset-btn:not(.is-disabled):active {
  background-color: #2f8ee5 !important;
  border-color: #2f8ee5 !important;
  color: #fff !important;
}

.recover-reset-btn.is-disabled,
.recover-reset-btn.is-disabled:hover,
.recover-reset-btn.is-disabled:focus,
.recover-reset-btn.is-disabled:active {
  background-color: #f2f4f7 !important;
  border-color: #e5e9f0 !important;
  color: #b6bfcc !important;
  box-shadow: none !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}

/* 用户说明文字样式 */
.user-explain {
  font-size: 12px;
  line-height: 20px;
  color: #6f6f6f;
}
</style>
