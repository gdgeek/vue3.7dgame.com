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
                <el-upload
                  class="avatar-uploader"
                  action=""
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="handleChangeUpload"
                  accept="image/jpeg,image/gif,image/png,image/bmp"
                  style="float: left"
                >
                  <img v-if="imageUrl" :src="imageUrl" class="avatar" />
                  <div v-else class="avatar-uploader-icon">
                    <font-awesome-icon icon="plus"></font-awesome-icon>
                  </div>
                </el-upload>
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
                    改绑邮箱
                  </el-button>
                  <el-button
                    type="danger"
                    plain
                    @click="openEmailDialog('unbind')"
                  >
                    解绑邮箱
                  </el-button>
                </template>
                <template v-else>
                  <el-button type="primary" @click="openEmailDialog('bind')">
                    绑定邮箱
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
                <el-form-item
                  :label="$t('homepage.account.label1')"
                  prop="email"
                >
                  <el-input
                    v-model="recoverForm.email"
                    type="email"
                    :placeholder="$t('homepage.account.rules1.message2')"
                  >
                    <template #append>
                      <el-button
                        :loading="recoverSending"
                        @click="handleRecoverSendEmail"
                      >
                        {{ $t("login.sendResetEmail") }}
                      </el-button>
                    </template>
                  </el-input>
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
              type="primary"
              :disabled="!recoverCodeVerified"
              :loading="recoverResetting"
              @click="handleRecoverResetPassword"
            >
              {{ $t("login.resetPassword") }}
            </el-button>
          </template>
        </el-dialog>

        <!-- 图片裁剪对话框 -->
        <el-dialog v-model="dialogVisible" class="crop-dialog" append-to-body>
          <template #header>
            {{ $t("homepage.edit.avatarCropping.title") }}
          </template>
          <div class="cropper-content">
            <div class="cropper" style="text-align: center">
              <VueCropper
                ref="cropperRef"
                :img="option.img"
                :output-type="option.outputType"
                :info="true"
                :full="option.full"
                :can-move-box="option.canMoveBox"
                :original="option.original"
                :auto-crop="option.autoCrop"
                :fixed="option.fixed"
                :fixed-number="option.fixedNumber"
                :center-box="option.centerBox"
                :info-true="option.infoTrue"
                :fixed-box="option.fixedBox"
                :auto-crop-width="option.autoCropWidth"
                :auto-crop-height="option.autoCropHeight"
              >
              </VueCropper>
            </div>
          </div>
          <template #footer>
            <div class="dialog-footer">
              <el-button-group style="float: left">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="rotateLeftHandle"
                >
                  {{ $t("homepage.edit.avatarCropping.leftRotation") }}
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="rotateRightHandle"
                >
                  {{ $t("homepage.edit.avatarCropping.rightRotation") }}
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="changeScaleHandle(1)"
                >
                  {{ $t("homepage.edit.avatarCropping.enlarge") }}
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="changeScaleHandle(-1)"
                >
                  {{ $t("homepage.edit.avatarCropping.shrink") }}
                </el-button>
              </el-button-group>
              <el-button-group>
                <el-button size="small" @click="dialogVisible = false">
                  {{ $t("homepage.edit.avatarCropping.cancel") }}
                </el-button>
                <el-button size="small" type="primary" @click="finish">
                  {{ $t("homepage.edit.avatarCropping.confirm") }}
                </el-button>
              </el-button-group>
            </div>
          </template>
        </el-dialog>
      </el-card>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { useUserStore } from "@/store/modules/user";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { ElMessage, FormInstance, FormRules } from "element-plus";
import "vue-cropper/dist/index.css";
import { VueCropper } from "vue-cropper";
import type { FileHandler } from "@/assets/js/file/server";
import { FormItemRule } from "element-plus";
import type { UploadFile, UploadFiles } from "element-plus";
import { _InfoType, UploadFileType } from "@/api/user/model";
import { getEmailStatus } from "@/api/v1/email";
import {
  changePassword,
  requestPasswordReset,
  verifyResetCode,
  resetPasswordByCode,
  type PasswordApiResponse,
} from "@/api/v1/password";
import { createPasswordFormRules } from "@/utils/password-validator";
import PasswordStrength from "@/components/PasswordStrength/index.vue";
import { useRouter } from "vue-router";
import EmailVerificationPanel from "@/components/Account/EmailVerificationPanel.vue";

// 初始化store和ref
const userStore = useUserStore();
const router = useRouter();
const fileStore = useFileStore();
const ruleFormRef = ref<FormInstance>();
const nickNameFormRef = ref<FormInstance>();
const { t } = useI18n();
const isDisable = ref(false);
const isLoading = ref(true);
const dialogVisible = ref(false);
const dialogEmailVisible = ref(false);
const emailDialogAction = ref<"default" | "bind" | "change" | "unbind">(
  "default"
);
const emailBound = ref(false);
const currentBoundEmail = ref("");
const dialogPasswordVisible = ref(false);
const dialogRecoverVisible = ref(false);
const passwordSubmitting = ref(false);
const recoverSending = ref(false);
const recoverVerifying = ref(false);
const recoverResetting = ref(false);
const recoverCodeVerified = ref(false);
const cropperRef = ref<InstanceType<typeof VueCropper> | null>(null);
const passwordFormRef = ref<FormInstance>();
const recoverFormRef = ref<FormInstance>();

// 计算用户头像URL
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

// 昵称表单相关定义
type nickNameType = {
  nickname: string;
};

const nicknameForm = ref<nickNameType>({
  nickname: "",
});

// 昵称验证规则
type Arrayable<T> = T | T[];
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
      validator: (rule, value, callback: (error?: Error) => void) => {
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

// 基本信息表单
const infoForm = ref<_InfoType>({
  sex: "man",
  industry: "",
  selectedOptions: [],
  textarea: "",
});

// 基本信息验证规则
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

const recoverForm = ref({
  email: "",
  code: "",
  password: "",
  checkPassword: "",
});

const recoverRules = computed(() => ({
  email: [
    {
      required: true,
      message: t("homepage.account.rules1.message1"),
      trigger: "blur",
    },
    {
      type: "email" as const,
      message: t("homepage.account.rules1.message2"),
      trigger: ["blur", "change"],
    },
  ],
  code: [
    {
      required: true,
      message: t("login.forgotTokenRequired"),
      trigger: "blur",
    },
    {
      pattern: /^\d{6}$/,
      message: t("homepage.edit.rules.code.invalid"),
      trigger: "blur",
    },
  ],
  password: [...createPasswordFormRules(t)],
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
        if (!value) {
          callback(new Error(t("homepage.account.rules2.check.error1")));
          return;
        }
        if (value !== recoverForm.value.password) {
          callback(new Error(t("homepage.account.rules2.check.error2")));
          return;
        }
        callback();
      },
      trigger: "blur",
    },
  ],
}));

// 行业选项
const industryOptions = computed(() => {
  return [
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
  ];
});

// 图片裁剪选项配置
type optionType = {
  img: string | ArrayBuffer | null;
  info: true;
  outputSize: number;
  outputType: "jpeg";
  canScale: boolean;
  autoCrop: boolean;
  autoCropWidth: number;
  autoCropHeight: number;
  fixedBox: boolean;
  fixed: boolean;
  fixedNumber: Array<number>;
  full: boolean;
  canMoveBox: boolean;
  original: boolean;
  centerBox: boolean;
  infoTrue: boolean;
};

const option = ref<optionType>({
  img: "", // 裁剪图片的地址
  info: true, // 裁剪框的大小信息
  outputSize: 1, // 裁剪生成图片的质量
  outputType: "jpeg", // 裁剪生成图片的格式
  canScale: true, // 图片是否允许滚轮缩放
  autoCrop: true, // 是否默认生成截图框
  canMoveBox: true, // 截图框能否拖动
  autoCropWidth: 300, // 默认生成截图框宽度
  autoCropHeight: 300, // 默认生成截图框高度
  fixedBox: false, // 固定截图框大小 不允许改变
  fixed: true, // 是否开启截图框宽高固定比例
  fixedNumber: [1, 1], // 截图框的宽高比例
  full: false, // 是否输出原图比例的截图
  original: false, // 上传图片按照原始比例渲染
  centerBox: true, // 截图框是否被限制在图片里面
  infoTrue: true, // true 为展示真实输出图片宽高 false 展示看到的截图框宽高
});

// 更新用户昵称
const submitNickname = async () => {
  isDisable.value = true;
  setTimeout(() => {
    isDisable.value = false; // 防重复提交，两秒后才能再次点击
  }, 2000);

  nickNameFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        isLoading.value = true;
        await userStore.setUserInfo({ nickname: nicknameForm.value.nickname });
        ElMessage.success(t("homepage.edit.rules.nickname.success"));
      } catch (error) {
        ElMessage.error(t("homepage.edit.rules.nickname.error3"));
      }
    } else {
      ElMessage.error(t("homepage.edit.rules.nickname.error4"));
    }
  });
};

// 更新用户基本信息
const saveInfo = () => {
  isDisable.value = true;
  setTimeout(() => {
    isDisable.value = false; // 防重复提交，两秒后才能再次点击
  }, 2000);

  ruleFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        isLoading.value = true;
        await userStore.setUserInfo({ info: infoForm.value });
        ElMessage.success(t("homepage.edit.rules.success"));
      } catch (error) {
        ElMessage.error(t("homepage.edit.rules.error1"));
      }
    } else {
      ElMessage.error(t("homepage.edit.rules.error2"));
    }
  });
};

const resetPasswordForm = () => {
  passwordForm.value.oldPassword = null;
  passwordForm.value.password = null;
  passwordForm.value.checkPassword = null;
  passwordFormRef.value?.clearValidate();
};

const openPasswordDialog = () => {
  checkCurrentEmailVerified().then((verified) => {
    if (!verified) {
      ElMessage.warning("邮箱未验证，请先完成邮箱验证后再修改密码");
      return;
    }
    dialogPasswordVisible.value = true;
  });
};

const openEmailDialog = (
  action: "default" | "bind" | "change" | "unbind" = "default"
) => {
  emailDialogAction.value = action;
  dialogEmailVisible.value = true;
};

const refreshEmailStatusSummary = async () => {
  try {
    const status = await getEmailStatus();
    if (!status.success || !status.data) {
      emailBound.value = false;
      currentBoundEmail.value = "";
      return;
    }

    emailBound.value = Boolean(status.data.email);
    currentBoundEmail.value = status.data.email || "";
  } catch (_error) {
    emailBound.value = false;
    currentBoundEmail.value = "";
  }
};

const submitPasswordChange = () => {
  passwordFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error(t("homepage.account.validate1.error2"));
      return;
    }
    passwordSubmitting.value = true;
    try {
      const verified = await checkCurrentEmailVerified();
      if (!verified) {
        ElMessage.error("邮箱未验证，请先完成邮箱验证后再修改密码");
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
      router.push("/site/logout");
    } catch (_error) {
      ElMessage.error(t("homepage.account.validate1.error1"));
    } finally {
      passwordSubmitting.value = false;
    }
  });
};

const getApiErrorMessage = (result: PasswordApiResponse, fallback: string) => {
  return result.error?.message || result.message || fallback;
};

const checkCurrentEmailVerified = async () => {
  try {
    const status = await getEmailStatus();
    return Boolean(status.success && status.data?.email_verified);
  } catch (_error) {
    return false;
  }
};

const checkCurrentEmailBound = async () => {
  try {
    const status = await getEmailStatus();
    return Boolean(status.success && status.data?.email);
  } catch (_error) {
    return false;
  }
};

const resetRecoverForm = () => {
  recoverCodeVerified.value = false;
  recoverForm.value.email = "";
  recoverForm.value.code = "";
  recoverForm.value.password = "";
  recoverForm.value.checkPassword = "";
  recoverFormRef.value?.clearValidate();
};

const openRecoverDialog = async () => {
  const isBound = await checkCurrentEmailBound();
  if (!isBound) {
    ElMessage.warning("当前账号未绑定邮箱，请先前往邮箱验证页面绑定邮箱");
    openEmailDialog("bind");
    return;
  }

  dialogRecoverVisible.value = true;
};

const handleRecoverSendEmail = async () => {
  const valid = await recoverFormRef.value
    ?.validateField("email")
    .then(() => true)
    .catch(() => false);
  if (!valid) return;

  recoverSending.value = true;
  try {
    const result = await requestPasswordReset(recoverForm.value.email);
    if (!result.success) {
      ElMessage.error(
        getApiErrorMessage(result, t("login.requestResetFailedFallback"))
      );
      return;
    }
    ElMessage.success(result.message || t("login.requestResetSuccess"));
  } catch (_error) {
    ElMessage.error(t("login.requestResetFailedFallback"));
  } finally {
    recoverSending.value = false;
  }
};

const handleRecoverVerifyCode = async () => {
  const valid = await recoverFormRef.value
    ?.validateField(["email", "code"])
    .then(() => true)
    .catch(() => false);
  if (!valid) return;

  recoverVerifying.value = true;
  try {
    const result = await verifyResetCode(
      recoverForm.value.email,
      recoverForm.value.code
    );
    if (!result.success || result.valid === false) {
      recoverCodeVerified.value = false;
      ElMessage.error(getApiErrorMessage(result, t("login.verifyTokenFailed")));
      return;
    }
    recoverCodeVerified.value = true;
    ElMessage.success(result.message || t("login.verifyTokenSuccess"));
  } catch (_error) {
    recoverCodeVerified.value = false;
    ElMessage.error(t("login.verifyTokenFailed"));
  } finally {
    recoverVerifying.value = false;
  }
};

const handleRecoverResetPassword = async () => {
  if (!recoverCodeVerified.value) {
    ElMessage.warning(t("login.verifyTokenFirst"));
    return;
  }
  const valid = await recoverFormRef.value
    ?.validateField(["password", "checkPassword"])
    .then(() => true)
    .catch(() => false);
  if (!valid) return;

  recoverResetting.value = true;
  try {
    const result = await resetPasswordByCode(
      recoverForm.value.email,
      recoverForm.value.code,
      recoverForm.value.password
    );
    if (!result.success) {
      ElMessage.error(
        getApiErrorMessage(result, t("login.resetPasswordFailedFallback"))
      );
      return;
    }
    ElMessage.success(result.message || t("login.resetPasswordSuccess"));
    dialogRecoverVisible.value = false;
  } catch (_error) {
    ElMessage.error(t("login.resetPasswordFailedFallback"));
  } finally {
    recoverResetting.value = false;
  }
};

// 处理图片上传并打开裁剪对话框
const handleChangeUpload = async (file: UploadFile, _fileList: UploadFiles) => {
  const selectedFile = file.raw;
  if (selectedFile) {
    // 验证图片格式和大小
    const isJPG = [
      "image/jpeg",
      "image/png",
      "image/bmp",
      "image/gif",
    ].includes(selectedFile.type);
    const isLt2M = selectedFile.size / 1024 / 1024 < 2;

    if (!isJPG) {
      ElMessage.error(t("homepage.edit.avatarCropping.error1"));
      return;
    }
    if (!isLt2M) {
      ElMessage.error(t("homepage.edit.avatarCropping.error2"));
      return;
    }

    // 上传成功后将图片地址赋值给裁剪框显示图片
    await nextTick();
    const res = URL.createObjectURL(selectedFile);
    option.value.img = res;
    dialogVisible.value = true;
  } else {
    ElMessage.error(t("homepage.edit.avatarCropping.error3"));
  }
};

// 裁剪框操作方法
const rotateLeftHandle = () => cropperRef.value?.rotateLeft();
const rotateRightHandle = () => cropperRef.value?.rotateRight();
const changeScaleHandle = (num: number) => {
  num = num || 1;
  cropperRef.value?.changeScale(num);
};

// 保存用户头像
const saveAvatar = async (
  md5: string,
  extension: string,
  file: File,
  handler: FileHandler
) => {
  extension = extension.startsWith(".") ? extension : `.${extension}`;
  const data: UploadFileType = {
    md5,
    key: md5 + extension,
    filename: file.name,
    url: fileStore.store.fileUrl(md5, extension, handler, "backup"),
  };

  try {
    isLoading.value = true;
    dialogVisible.value = false;
    const post = await postFile(data);
    await userStore.setUserInfo({ avatar_id: post.data.id });
    ElMessage.success(t("homepage.edit.avatarCropping.success"));
  } catch (err) {
    logger.error(err);
  }
};

// 完成头像裁剪并上传
const finish = async () => {
  cropperRef.value.getCropBlob(async (blob: Blob) => {
    // 创建File对象
    const file = new File(
      [blob],
      userStore.userInfo?.userData?.username + ".jpg",
      {
        type: "image/jpeg",
      }
    );

    const md5 = await fileStore.store.fileMD5(file);
    const handler = await fileStore.store.publicHandler();
    if (!handler) {
      ElMessage.error(t("homepage.edit.avatarCropping.error4"));
      return;
    }

    // 检查文件是否已存在
    const has = await fileStore.store.fileHas(
      md5,
      file.name.split(".").pop() || "",
      handler,
      "backup"
    );

    if (!has) {
      await fileStore.store.fileUpload(
        md5,
        file.name.split(".").pop() || "",
        file,
        (_p: number) => {},
        handler,
        "backup"
      );
    }

    // 保存头像
    await saveAvatar(
      md5,
      "." + (file.name.split(".").pop() || ""),
      file,
      handler
    );

    dialogVisible.value = false;
  });
};

onMounted(() => {
  refreshEmailStatusSummary();
});

// 监听用户信息变化，更新表单数据
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

/* 用户说明文字样式 */
.user-explain {
  font-size: 12px;
  line-height: 20px;
  color: #6f6f6f;
}

/* 裁剪框样式 */
.cropper-content {
  .cropper {
    width: auto;
    height: 350px;
  }
}

/* 头像上传样式 */
.avatar-uploader {
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: #409eff;
  }
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 132px;
  height: 132px;
  line-height: 132px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  margin-right: 12px;
  border-radius: 6px;
}

.avatar {
  width: 132px;
  height: 132px;
  display: block;
  border-radius: 6px;
  margin-right: 12px;
}
</style>
