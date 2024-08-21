<template>
  <div>
    <el-upload
      class="file-uploader"
      action=""
      :auto-upload="false"
      :show-file-list="false"
      :on-change="handleChangeUpload"
      accept="image/jpeg,image/gif,image/png,image/bmp"
      style="float: left"
    >
      <img v-if="url" :src="url" class="file" />
      <i v-else class="el-icon-plus file-uploader-icon"></i>
    </el-upload>

    <el-dialog
      title="头像截取"
      v-model="dialogVisible"
      class="crop-dialog"
      append-to-body
    >
      <div class="cropper-content">
        <div class="cropper" style="text-align: center">
          <vueCropper
            ref="cropperRef"
            :img="option.img"
            :output-size="option.outputSize"
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
          ></vueCropper>
        </div>
      </div>

      <template #footer>
        <el-button-group style="float: left">
          <el-button
            size="small"
            type="primary"
            plain
            @click="rotateLeftHandle"
          >
            左旋转
          </el-button>
          <el-button
            size="small"
            type="primary"
            plain
            @click="rotateRightHandle"
          >
            右旋转
          </el-button>
          <el-button
            size="small"
            type="primary"
            plain
            @click="changeScaleHandle(1)"
          >
            放大
          </el-button>
          <el-button
            size="small"
            type="primary"
            plain
            @click="changeScaleHandle(-1)"
          >
            缩小
          </el-button>
        </el-button-group>
        <el-button-group>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="loading" @click="finish">
            确认
          </el-button>
        </el-button-group>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import "vue-cropper/dist/index.css";
import { VueCropper } from "vue-cropper";
import { postFile } from "@/api/v1/files";
import { useFileStore } from "@/store/modules/config";
import { UploadFile } from "element-plus";

const props = defineProps<{
  imageUrl: string | null;
  fileName: string;
}>();

const emit = defineEmits(["saveFile"]);

const cropperRef = ref<InstanceType<typeof VueCropper> | null>(null);

console.log("props.imageUrl, fileName", props.imageUrl, props.fileName);
const fileStore = useFileStore();

const url = ref<string | null>(null);
const dialogVisible = ref(false);
const loading = ref(false);

type optionType = {
  img: string | ArrayBuffer | null; // 裁剪图片的地址
  info: true; // 裁剪框的大小信息
  outputSize: number; // 裁剪生成图片的质量 [1至0.1]
  outputType: "jpeg"; // 裁剪生成图片的格式
  canScale: boolean; // 图片是否允许滚轮缩放
  autoCrop: boolean; // 是否默认生成截图框
  canMove: boolean; // 上传图片是否可以移动
  canMoveBox: boolean; // 截图框能否拖动
  autoCropWidth: number; // 默认生成截图框宽度
  autoCropHeight: number; // 默认生成截图框高度
  fixedBox: boolean; // 固定截图框大小 不允许改变
  fixed: boolean; // 是否开启截图框宽高固定比例
  fixedNumber: Array<number>; // 截图框的宽高比例  需要配合centerBox一起使用才能生效
  full: boolean; // 是否输出原图比例的截图
  original: boolean; // 上传图片按照原始比例渲染
  centerBox: boolean; // 截图框是否被限制在图片里面
  infoTrue: boolean; // true 为展示真实输出图片宽高 false 展示看到的截图框宽高
};

// 裁剪组件的基础配置 option
const option = ref<optionType>({
  img: "", // 裁剪图片的地址
  info: true, // 裁剪框的大小信息
  outputSize: 1, // 裁剪生成图片的质量
  outputType: "jpeg", // 裁剪生成图片的格式
  canScale: true, // 图片是否允许滚轮缩放
  autoCrop: true, // 是否默认生成截图框
  canMove: true, // 上传图片是否可以移动
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

url.value = props.imageUrl;
console.log("url", url.value);

// 上传按钮 限制图片大小和类型
const handleChangeUpload = async (file: UploadFile) => {
  const selectedFile = file.raw;
  if (selectedFile) {
    const isJPG = [
      "image/jpeg",
      "image/png",
      "image/bmp",
      "image/gif",
    ].includes(selectedFile.type);
    const isLt2M = selectedFile.size / 1024 / 1024 < 2;

    if (!isJPG) {
      ElMessage.error("上传头像图片只能是 JPG/PNG/BMP/GIF 格式!");
      return false;
    }
    if (!isLt2M) {
      ElMessage.error("上传头像图片大小不能超过 2MB!");
      return false;
    }

    await nextTick();
    option.value.img = URL.createObjectURL(selectedFile);
    loading.value = false;
    dialogVisible.value = true;
  } else {
    ElMessage.error("请选择有效的文件！");
  }
};

// 放大/缩小
const changeScaleHandle = (num: number) => {
  num = num || 1;
  cropperRef.value?.changeScale(num);
};

// 左旋转
const rotateLeftHandle = () => {
  cropperRef.value?.rotateLeft();
};

// 右旋转
const rotateRightHandle = () => {
  cropperRef.value?.rotateRight();
};

// 截图框移动回调函数
const cropMoving = (data: any) => {
  // 截图框的左上角 x，y和右下角坐标x，y
  // const cropAxis = [data.axis.x1, data.axis.y1, data.axis.x2, data.axis.y2]
  // console.log(cropAxis)
};

const saveFile = async (
  md5: string,
  extension: string,
  file: File,
  handler: any
) => {
  const data = {
    filename: file.name,
    md5,
    key: md5 + extension,
    url: fileStore.store.fileUrl(md5, extension, handler, "backup"),
  };
  console.log("测试1");
  url.value = data.url;
  console.log("url2", url.value);
  console.log("测试2");

  try {
    const response = await postFile(data);
    emit("saveFile", response.data.id);
  } catch (err) {
    console.error(err);
  }
  loading.value = false;
};

const finish = async () => {
  cropperRef.value?.getCropBlob(async (blob: Blob) => {
    const fileName = props.fileName;
    // const fileExtension = ".jpg";

    // 将 Blob 转换为 File
    const file = new File([blob], fileName, { type: "image/jpeg" }) as File & {
      extension: string;
    };
    file.extension = ".jpg";

    const md5 = await fileStore.store.fileMD5(file);
    const handler = await fileStore.store.publicHandler();

    const has = await fileStore.store.fileHas(
      md5,
      file.extension,
      handler,
      "backup"
    );
    if (!has) {
      await fileStore.store.fileUpload(
        md5,
        file.extension,
        file,
        (p: any) => {},
        handler,
        "backup"
      );
    }
    console.log("图片数据", md5, file.extension, file, handler);
    await saveFile(md5, file.extension, file, handler);

    dialogVisible.value = false;
    loading.value = true;
  });
};
</script>

<style lang="scss" scoped>
.cropper-content {
  .cropper {
    width: auto;
    height: 350px;
  }
}

.file-uploader {
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.file-uploader:hover {
  border-color: #409eff;
}

.file-uploader-icon {
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

.file {
  width: 132px;
  height: 132px;
  display: block;
  border-radius: 6px;
  margin-right: 12px;
}
</style>
