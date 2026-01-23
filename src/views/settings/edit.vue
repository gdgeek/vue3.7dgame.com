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
          <el-col :xs="23" :sm="16" :md="14" :lg="12" :xl="10" class="section-margin-left">
            <el-form ref="nickNameFormRef" :model="nicknameForm" :rules="nicknameRules" label-width="auto">
              <!-- 昵称输入框 -->
              <el-form-item :label="$t('homepage.edit.nickname')" prop="nickname" style="margin-bottom: 26px">
                <el-input v-model="nicknameForm.nickname" style="width: 100%"
                  :placeholder="$t('homepage.edit.nickname')" autocomplete="off" @keyup.enter="submitNickname">
                  <template #suffix>
                    <el-button style="margin-right: -10px" :disabled="isDisable" @click="submitNickname">
                      {{ $t("homepage.edit.confirm") }}
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>

              <!-- 头像上传 -->
              <el-form-item :label="$t('homepage.edit.avatar')">
                <el-upload class="avatar-uploader" action="" :auto-upload="false" :show-file-list="false"
                  :on-change="handleChangeUpload" accept="image/jpeg,image/gif,image/png,image/bmp" style="float: left">
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
          <el-col :xs="23" :sm="16" :md="14" :lg="12" :xl="10" class="section-margin-left box-margin-bottom">
            <el-form ref="ruleFormRef" :model="infoForm" :rules="infoRules" label-width="auto">
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
              <el-form-item :label="$t('homepage.edit.industry')" prop="industry">
                <el-select v-model="infoForm.industry" style="width: 100%"
                  :placeholder="$t('homepage.edit.industryStatement')">
                  <el-option v-for="item in industryOptions" :key="item.value" :label="item.label"
                    :value="item.value"></el-option>
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
              <el-form-item :label="$t('homepage.edit.individualResume')" prop="textarea">
                <el-input v-model="infoForm.textarea" style="width: 100%" type="textarea"
                  :autosize="{ minRows: 4, maxRows: 10 }"
                  :placeholder="$t('homepage.edit.individualResumeStatement')"></el-input>
              </el-form-item>

              <!-- 保存按钮 -->
              <el-form-item>
                <el-button type="primary" style="width: 150px" :disabled="isDisable" @click="saveInfo">
                  {{ $t("homepage.edit.save") }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-col>
        </el-row>

        <el-divider></el-divider>

        <!-- 邮箱验证部分 -->
        <div class="box-title box-margin-bottom">
          <h3 class="font-color">{{ $t("homepage.edit.emailVerification") }}</h3>
          <small>{{ $t("homepage.edit.emailVerificationStatement") }}</small>
        </div>

        <el-row :gutter="24">
          <el-col :xs="23" :sm="16" :md="14" :lg="12" :xl="10" class="section-margin-left box-margin-bottom">
            <el-form ref="emailFormRef" :model="emailForm" :rules="emailRules" label-width="auto">
              <!-- 邮箱输入 -->
              <el-form-item :label="$t('homepage.edit.email')" prop="email">
                <el-input v-model="emailForm.email" type="email" :placeholder="$t('homepage.edit.emailPlaceholder')"
                  :disabled="emailLoading" />
              </el-form-item>

              <!-- 验证码输入 -->
              <el-form-item :label="$t('homepage.edit.verificationCode')" prop="code">
                <div style="display: flex; gap: 10px">
                  <el-input v-model="emailForm.code" :placeholder="$t('homepage.edit.codePlaceholder')" maxlength="6"
                    :disabled="emailLoading || isLocked" @input="handleCodeInput" />
                  <el-button type="primary" :disabled="!canSendCode || !emailForm.email" :loading="emailLoading"
                    @click="handleSendCode">
                    {{ sendCodeButtonText }}
                  </el-button>
                </div>
              </el-form-item>

              <!-- 锁定提示 -->
              <el-alert v-if="isLocked" type="warning" :closable="false" show-icon style="margin-bottom: 20px">
                {{ $t("homepage.edit.accountLocked", { time: lockTime }) }}
              </el-alert>

              <!-- 验证按钮 -->
              <el-form-item>
                <el-button type="success" :disabled="!canVerify || !emailForm.email || !emailForm.code"
                  :loading="emailLoading" @click="handleVerify">
                  {{ $t("homepage.edit.verifyEmail") }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-col>
        </el-row>

        <!-- 图片裁剪对话框 -->
        <el-dialog v-model="dialogVisible" class="crop-dialog" append-to-body>
          <template #header>
            {{ $t("homepage.edit.avatarCropping.title") }}
          </template>
          <div class="cropper-content">
            <div class="cropper" style="text-align: center">
              <VueCropper ref="cropperRef" :img="option.img" :output-type="option.outputType" :info="true"
                :full="option.full" :can-move-box="option.canMoveBox" :original="option.original"
                :auto-crop="option.autoCrop" :fixed="option.fixed" :fixed-number="option.fixedNumber"
                :center-box="option.centerBox" :info-true="option.infoTrue" :fixed-box="option.fixedBox"
                :auto-crop-width="option.autoCropWidth" :auto-crop-height="option.autoCropHeight">
              </VueCropper>
            </div>
          </div>
          <template #footer>
            <div class="dialog-footer">
              <el-button-group style="float: left">
                <el-button size="small" type="primary" plain @click="rotateLeftHandle">
                  {{ $t("homepage.edit.avatarCropping.leftRotation") }}
                </el-button>
                <el-button size="small" type="primary" plain @click="rotateRightHandle">
                  {{ $t("homepage.edit.avatarCropping.rightRotation") }}
                </el-button>
                <el-button size="small" type="primary" plain @click="changeScaleHandle(1)">
                  {{ $t("homepage.edit.avatarCropping.enlarge") }}
                </el-button>
                <el-button size="small" type="primary" plain @click="changeScaleHandle(-1)">
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
import { useEmailVerification } from "@/composables/useEmailVerification";

// 初始化store和ref
const userStore = useUserStore();
const fileStore = useFileStore();
const ruleFormRef = ref<FormInstance>();
const nickNameFormRef = ref<FormInstance>();
const emailFormRef = ref<FormInstance>();
const { t } = useI18n();
const isDisable = ref(false);
const isLoading = ref(true);
const dialogVisible = ref(false);
const cropperRef = ref<any>({});

// 初始化邮箱验证Composable
const {
  loading: emailLoading,
  error: emailError,
  countdown,
  isLocked,
  lockTime,
  canSendCode,
  canVerify,
  sendCode,
  verifyCode,
  cleanup: cleanupEmailVerification,
} = useEmailVerification();

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

// 邮箱验证表单
type EmailFormType = {
  email: string;
  code: string;
};

const emailForm = ref<EmailFormType>({
  email: "",
  code: "",
});

// 邮箱验证规则
const emailRules = ref<FormRules<EmailFormType>>({
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

// 处理图片上传并打开裁剪对话框
const handleChangeUpload = async (file: UploadFile, fileList: UploadFiles) => {
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
    console.error(err);
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
        (p: any) => { },
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

// 邮箱验证相关函数

// 发送验证码按钮文本
const sendCodeButtonText = computed(() => {
  if (countdown.value > 0) {
    return `${countdown.value}秒后重试`;
  }
  return t("homepage.edit.sendCode");
});

// 发送验证码
const handleSendCode = async () => {
  if (!emailForm.value.email) {
    ElMessage.warning(t("homepage.edit.rules.email.required"));
    return;
  }

  // 验证邮箱格式
  await emailFormRef.value?.validateField("email", async (valid: boolean) => {
    if (!valid) {
      return;
    }

    const success = await sendCode(emailForm.value.email);

    if (success) {
      ElMessage.success(t("emailVerification.codeSent"));
    } else if (emailError.value) {
      ElMessage.error(emailError.value);
    }
  });
};

// 验证码输入处理（只允许数字，最多6位）
const handleCodeInput = (value: string) => {
  emailForm.value.code = value.replace(/\D/g, "").slice(0, 6);
};

// 验证邮箱
const handleVerify = async () => {
  if (!emailForm.value.email || !emailForm.value.code) {
    ElMessage.warning(t("homepage.edit.rules.code.required"));
    return;
  }

  // 验证表单
  await emailFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) {
      return;
    }

    const success = await verifyCode(emailForm.value.email, emailForm.value.code);

    if (success) {
      ElMessage.success(t("emailVerification.verifySuccess"));
      // 清空表单
      emailForm.value.code = "";
    } else if (emailError.value) {
      ElMessage.error(emailError.value);
    }
  });
};

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

// 组件卸载时清理定时器
onUnmounted(() => {
  cleanupEmailVerification();
});
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
