<template>
  <div>
    <el-card class="box-card">
      <el-row>
        <el-col>
          <div class="box-title">
            <h3 class="font-color">个人资料</h3>
            <small>用户昵称、头像、基本信息修改</small>
          </div>
        </el-col>
        <el-col align="right">
          <span>
            <router-link to="/home/index">
              <el-button size="small">返回个人中心</el-button>
            </router-link>
          </span>
        </el-col>
      </el-row>
      <el-divider></el-divider>
      <div class="box-title box-margin-bottom">
        <h3 class="font-color">用户昵称</h3>
        <small>让MrPP社区的其它用户更容易认识您。</small>
      </div>
      <!-- 用户头像和昵称开始 -->
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
            label-width="80px"
          >
            <el-form-item
              label="昵称"
              prop="nickname"
              style="margin-bottom: 26px"
            >
              <el-input
                v-model="nicknameForm.nickname"
                style="width: 100%"
                placeholder="昵称"
                autocomplete="off"
                @keyup.enter="submitNickname"
              >
                <template #suffix>
                  <el-button
                    style="margin-right: -5px"
                    :disabled="isDisable"
                    @click="submitNickname"
                  >
                    确定
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <!-- 头像部分 -->
            <el-form-item label="头像">
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
                <i v-else class="el-icon-plus avatar-uploader-icon"></i>
              </el-upload>
              <div style="float: left">
                <p class="user-explain">最大尺寸 2 MB。JPG、GIF、PNG。</p>
              </div>
            </el-form-item>
            <!-- 头像部分 end -->
          </el-form>
        </el-col>
      </el-row>
      <!-- 用户头像和昵称 end -->
      <el-divider></el-divider>
      <div class="box-title box-margin-bottom">
        <h3 class="font-color">基本信息</h3>
        <small style="line-height: 16px">
          请填写你的基本信息，以获得更有乐趣的个性化交互和体验。
        </small>
      </div>
      <!-- 用户基本信息 start -->
      <el-row :gutter="24">
        <el-col
          :xs="23"
          :sm="16"
          :md="14"
          :lg="12"
          :xl="10"
          class="section-margin-left box-margin-bottom"
        >
          <el-form
            ref="ruleFormRef"
            :model="infoForm"
            :rules="infoRules"
            label-width="80px"
          >
            <el-form-item label="性别">
              <el-radio-group v-model="infoForm.sex">
                <el-radio-button label="man" value="man">
                  <el-icon><Male></Male></el-icon>
                  男
                </el-radio-button>
                <el-radio-button label="woman" value="woman">
                  <el-icon><Female></Female></el-icon>
                  女
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="行业" prop="industry">
              <el-select
                v-model="infoForm.industry"
                style="width: 100%"
                placeholder="请选择活动区域"
              >
                <el-option
                  v-for="item in industryOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="居住地" prop="selectedOptions">
              <el-cascader
                v-model="infoForm.selectedOptions"
                size="large"
                :options="addressOptions"
                style="width: 100%"
                @change="handleChange"
              ></el-cascader>
            </el-form-item>
            <el-form-item label="个人简介" prop="textarea">
              <el-input
                v-model="infoForm.textarea"
                style="width: 100%"
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 10 }"
                placeholder="个人信息的简要介绍"
              ></el-input>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                style="width: 150px"
                :disabled="isDisable"
                @click="saveInfo"
              >
                保存
              </el-button>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>
      <!-- 用户基本信息 end -->
      <!-- vueCropper 剪裁图片dialog实现 -->
      <el-dialog
        title="头像截取"
        v-model:visible="dialogVisible"
        class="crop-dialog"
        append-to-body
      >
        <div class="cropper-content">
          <div class="cropper" style="text-align: center">
            <vue-cropper
              ref="cropper"
              :img="option.img"
              :output-size="option.size"
              :output-type="option.outputType"
              :info="true"
              :full="option.full"
              :can-move="option.canMove"
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
              @crop-moving="cropMoving"
            ></vue-cropper>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-button-group style="float: left">
              <el-button
                size="mini"
                type="primary"
                plain
                @click="rotateLeftHandle"
              >
                左旋转
              </el-button>
              <el-button
                size="mini"
                type="primary"
                plain
                @click="rotateRightHandle"
              >
                右旋转
              </el-button>
              <el-button
                size="mini"
                type="primary"
                plain
                @click="changeScaleHandle(1)"
              >
                放大
              </el-button>
              <el-button
                size="mini"
                type="primary"
                plain
                @click="changeScaleHandle(-1)"
              >
                缩小
              </el-button>
            </el-button-group>
            <el-button-group>
              <el-button size="mini" @click="dialogVisible = false">
                取 消
              </el-button>
              <el-button
                size="mini"
                type="primary"
                :loading="loading"
                @click="finish"
              >
                确认
              </el-button>
            </el-button-group>
          </div>
        </template>
      </el-dialog>
      <!-- vueCropper 剪裁图片dialog end -->
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "@/store/modules/user";
import { useRoute } from "vue-router";
import { putUserData } from "@/api/v1/user";
import { regionData, codeToText } from "element-china-area-data";
import { postFile } from "@/api/v1/files";
import { ElMessage, FormInstance, FormRules } from "element-plus";
import VueCropper from "vue-cropper";
import type { InfoType } from "@/api/user/model";

const userStore = useUserStore();
const ruleFormRef = ref<FormInstance>();
const nickNameFormRef = ref<FormInstance>();
const route = useRoute();
// const userData = computed(() => store.getters.userData);
const imageUrl = computed(() => userStore.userInfo.data.avatar.url || null);

const isDisable = ref(false);

type nickNameType = {
  nickname: string;
};

const nicknameForm = ref<nickNameType>({
  nickname: "",
});

type Rule = {
  required?: boolean;
  message?: string;
  trigger?: string;
  min?: number;
  validator?: (
    rule: Rule,
    value: string,
    callback: (error?: Error) => void
  ) => void;
};

const nicknameRules = ref<Record<string, Rule[]>>({
  nickname: [
    { required: true, message: "请输入用户昵称", trigger: "blur" },
    { min: 2, message: "昵称长度应该大于2", trigger: "blur" },
    {
      validator: (rule, value, callback: (error?: Error) => void) => {
        if (value === "") {
          callback(new Error("昵称不能为空"));
        } else if (!/^[\u4e00-\u9fa5_a-zA-Z0-9-]+$/.test(value)) {
          callback(new Error("昵称仅支持中文、字母、数字、下划线"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
});

// 基本信息表单
const infoForm = ref<InfoType>({
  sex: "man",
  industry: "",
  selectedOptions: [],
  textarea: "",
});
const infoRules = ref<FormRules<InfoType>>({
  industry: [{ required: true, message: "请选择行业", trigger: "change" }],
  selectedOptions: [
    { required: true, message: "请选择居住地", trigger: "change" },
  ],
  textarea: [
    { required: true, message: "请输入个人简介", trigger: "blur" },
    { min: 10, message: "个人简介应多于10个字符", trigger: "blur" },
  ],
});

const industryOptions = [
  {
    label: "科技、信息技术",
    value: "科技、信息技术",
  },
  {
    label: "经济、金融",
    value: "经济、金融",
  },
  {
    label: "教育、医疗",
    value: "教育、医疗",
  },
  {
    label: "能源、制造业",
    value: "能源、制造业",
  },
  {
    label: "农、林、渔、牧",
    value: "农、林、渔、牧",
  },
  {
    label: "服务业",
    value: "服务业",
  },
  {
    label: "其他行业",
    value: "其他行业",
  },
];

const addressOptions = ref(regionData);
const dialogVisible = ref(false);
const option = ref({
  img: "",
  size: 1,
  outputType: "jpeg",
  full: false,
  canMove: true,
  canMoveBox: true,
  original: false,
  autoCrop: true,
  fixed: true,
  fixedNumber: [1, 1],
  centerBox: true,
  infoTrue: true,
  fixedBox: true,
  autoCropWidth: 300,
  autoCropHeight: 300,
});
const loading = ref(false);
// const cropper = ref(null);

const submitNickname = async () => {
  nickNameFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        await putUserData({ nickname: nicknameForm.value.nickname });
        ElMessage.success("昵称更新成功");
      } catch (error) {
        ElMessage.error("昵称更新失败");
      }
    } else {
      ElMessage({ type: "error", message: "表单校验未通过" });
    }
  });
};

const handleChangeUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = () => {
    option.value.img = reader.result as string;
    dialogVisible.value = true;
  };
  reader.readAsDataURL(file);
};

const handleChange = (value: any) => {
  infoForm.value.selectedOptions = value;
};

const saveInfo = () => {
  ruleFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const infoFormJS = await JSON.stringify(infoForm.value);
        console.log("infoForm.value", infoFormJS);
        await putUserData({ info: infoFormJS });
        ElMessage.success("信息更新成功");
      } catch (error) {
        ElMessage.error("信息更新失败");
      }
    } else {
      ElMessage({ type: "error", message: "表单校验未通过" });
    }
  });
};

type CropperType = {
  getCropData: () => Promise<{ img: Blob }>;
  rotate: (degrees: number) => void;
  changeScale: (num: number) => void;
};

const cropper: globalThis.Ref<null | CropperType> = ref(null);

const finish = async () => {
  loading.value = true;
  try {
    if (cropper.value) {
      const { img } = await cropper.value.getCropData();
      const formData = new FormData();
      formData.append("file", img);
      await postFile(formData);
      ElMessage.success("头像上传成功");
      dialogVisible.value = false;
    } else {
      throw new Error("裁剪器未初始化");
    }
  } catch (error) {
    ElMessage.error("头像上传失败");
  } finally {
    loading.value = false;
  }
};

// 左旋转
const rotateLeftHandle = () => cropper.value?.rotate(-90);
// 右旋转
const rotateRightHandle = () => cropper.value?.rotate(90);
// 放大/缩小
const changeScaleHandle = (num: number) => cropper.value?.changeScale(num);

const cropMoving = (data: any) => {
  // handle crop moving logic here
};

onMounted(async () => {
  await userStore.getUserInfo();
  const parsedInfo = userStore.userInfo.data?.parsedInfo;
  nicknameForm.value.nickname = userStore.userInfo.data?.nickname || "";
  if (parsedInfo) {
    infoForm.value.sex = parsedInfo.sex || "";
    infoForm.value.industry = parsedInfo.industry || "";
    infoForm.value.selectedOptions = parsedInfo.selectedOptions || [];
    infoForm.value.textarea = parsedInfo.textarea || "";
  }
});
</script>

<style lang="scss" scoped>
@media screen and (min-width: 900px) {
  .section-margin-left {
    margin-left: 12%;
  }
}
.box-card {
  margin: 1.6% 1.6% 0.6%;
}
.box-title {
  line-height: 10px;
  padding: 2px 0;
  margin-left: 1%;
  color: #4d4f52;
}
.box-margin-bottom {
  margin-bottom: 28px;
}
.font-color {
  font-weight: 500;
}
.user-explain {
  font-size: 12px;
  line-height: 20px;
}
.cropper-content {
  .cropper {
    width: auto;
    height: 350px;
  }
}

.avatar-uploader {
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.avatar-uploader:hover {
  border-color: #409eff;
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
