<template>
  <TransitionWrapper>
    <div v-loading="loading" class="document-index">
      <el-row :gutter="20" style="margin: 28px 18px 0">
        <!-- 体素模型渲染区域 -->
        <el-col :sm="16">
          <el-card class="box-card">
            <template #header>
              <b id="title">{{ $t("voxel.view.title") }}</b>
              <span v-if="voxelData">{{ voxelData.name }}</span>
            </template>
            <div v-loading="false" class="box-item">
              <Voxel
                v-if="voxelData"
                ref="three"
                :file="voxelData.file"
                @loaded="loaded"
                @progress="progress"
              >
              </Voxel>
            </div>
            <el-progress :percentage="percentage"></el-progress>
          </el-card>
          <br />
          <!-- 创建虚拟世界按钮
          <el-card v-loading="false" class="box-card">
            <el-button style="width: 100%" type="primary" size="small" @click="createVerse">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;{{ $t("voxel.view.titleStatement") }}
            </el-button>
          </el-card> -->
          <br />
        </el-col>

        <!-- 体素模型信息和操作区域 -->
        <el-col :sm="8">
          <MrppInfo
            v-if="voxelData"
            :title="$t('voxel.view.info.title')"
            titleSuffix=" :"
            :tableData="tableData"
            :itemLabel="$t('voxel.view.info.label1')"
            :textLabel="$t('voxel.view.info.label2')"
            :downloadText="$t('voxel.view.info.download')"
            :renameText="$t('voxel.view.info.name')"
            :deleteText="$t('voxel.view.info.delete')"
            @download="downloadVoxel"
            @rename="namedWindow"
            @delete="deleteWindow"
          >
          </MrppInfo>
          <br />
        </el-col>
      </el-row>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useFileStore } from "@/store/modules/config";
import { getVoxel, putVoxel, deleteVoxel } from "@/api/v1/resources/index";
import { createVerseFromResource } from "@/api/v1/meta-verse";
import { postFile } from "@/api/v1/files";
import { UploadFileType } from "@/api/user/model";
import { printVector3 } from "@/assets/js/helper";
import Voxel from "@/components/Voxel.vue";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import MrppInfo from "@/components/MrPP/MrppInfo/index.vue";
import { downloadResource } from "@/utils/downloadHelper";

// 基本状态管理
const loading = ref(false);

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface VoxelInfo {
  size: Vector3;
  center: Vector3;
  count: number;
}

interface ResourceFile {
  url: string;
  size: number;
}

interface ResourceAuthor {
  nickname: string;
}

interface VoxelData {
  id: string | number;
  name: string;
  info: string;
  file: ResourceFile;
  author: ResourceAuthor;
  created_at: string;
  image_id?: number;
}

const voxelData = ref<VoxelData | null>(null);
const percentage = ref(0);
const expire = ref(false);

// 工具和路由
const store = useFileStore().store;
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

// 计算属性：获取URL中的体素ID
const id = computed(() => route.query.id as string);

// 计算属性：检查体素信息是否已准备好
const prepare = computed(
  () => voxelData.value != null && voxelData.value.info !== null
);

// 组件引用
const three = ref<InstanceType<typeof Voxel> | null>(null);

// 获取体素信息数据
const dataInfo = computed(() =>
  voxelData.value && prepare.value ? JSON.parse(voxelData.value.info) : null
);

// 计算体素网格尺寸
const meshSize = computed(() =>
  prepare.value ? dataInfo.value.size : t("voxel.view.update")
);

// 计算体素网格中心点
const meshCenter = computed(() =>
  prepare.value ? dataInfo.value.center : t("voxel.view.update")
);

// 计算体素信息表格数据
const tableData = computed(() => {
  if (voxelData.value != null && prepare.value) {
    const info = JSON.parse(voxelData.value.info);

    return [
      { item: t("voxel.view.info.item1"), text: voxelData.value.name },
      {
        item: t("voxel.view.info.item2"),
        text: voxelData.value.author.nickname,
      },
      {
        item: t("voxel.view.info.item3"),
        text: convertToLocalTime(voxelData.value.created_at),
      },
      {
        item: t("voxel.view.info.item4"),
        text: formatFileSize(voxelData.value.file.size),
      },
      { item: t("voxel.view.info.item5"), text: printVector3(info.size) },
      { item: t("voxel.view.info.item6"), text: printVector3(info.center) },
      { item: t("voxel.view.info.item7"), text: info.count },
    ];
  } else {
    return [];
  }
});

// 体素下载功能
const downloadVoxel = async () => {
  if (!voxelData.value) return;

  // 确保下载文件的扩展名为.vox
  await downloadResource(
    {
      name: voxelData.value.name || "voxel",
      file: voxelData.value.file,
    },
    ".vox",
    t,
    "voxel.view.download"
  );
};

// 加载体素数据
const loadVoxelData = async () => {
  expire.value = true;
  try {
    const response = await getVoxel(id.value);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    voxelData.value = (response as any).data;
  } catch (error) {
    console.error(error);
  }
};

// 更新加载进度
const progress = (progress: number) => {
  percentage.value = progress;
};

// 基于体素创建虚拟世界
const createVerse = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("voxel.view.prompt.message1"),
      t("voxel.view.prompt.message2"),
      {
        confirmButtonText: t("voxel.view.prompt.confirm"),
        cancelButtonText: t("voxel.view.prompt.cancel"),
        inputValue: voxelData.value.name,
        inputErrorMessage: t("voxel.view.prompt.inputError"),
      }
    );

    if (value) {
      loading.value = true;
      try {
        // 调用API创建虚拟世界
        const result = await createVerseFromResource(
          "Voxel",
          value,
          voxelData.value
        );

        ElMessage.success(t("voxel.view.prompt.success") + value);
        // 创建成功后跳转到虚拟世界查看页面
        setTimeout(() => {
          router.push({
            path: "/verse/view",
            query: { id: result.verse.id },
          });
        }, 300);
      } catch (error) {
        ElMessage.error(t("voxel.view.prompt.error") + error);
      } finally {
        loading.value = false;
      }
    } else {
      ElMessage.info(t("voxel.view.prompt.info"));
    }
  } catch {
    ElMessage.info(t("voxel.view.prompt.info"));
  }
};

// 删除体素确认对话框
const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm(
      t("voxel.view.confirm.message1"),
      t("voxel.view.confirm.message2"),
      {
        confirmButtonText: t("voxel.view.confirm.confirm"),
        cancelButtonText: t("voxel.view.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );

    // 执行删除操作
    await deleteVoxel(voxelData.value.id);
    ElMessage.success(t("voxel.view.confirm.success"));
    // 删除成功后返回体素列表页
    router.push("/resource/voxel/index");
  } catch {
    ElMessage.info(t("voxel.view.confirm.info"));
  }
};

// 重命名体素对话框
const namedWindow = async () => {
  if (!voxelData.value) return;
  try {
    const { value } = await ElMessageBox.prompt(
      t("voxel.view.namePrompt.message1"),
      t("voxel.view.namePrompt.message2"),
      {
        confirmButtonText: t("voxel.view.namePrompt.confirm"),
        cancelButtonText: t("voxel.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: voxelData.value.name,
      }
    );

    if (value) {
      await named(voxelData.value.id, value);
      ElMessage.success(t("voxel.view.namePrompt.success") + value);
    } else {
      ElMessage.info(t("voxel.view.namePrompt.info"));
    }
  } catch {
    ElMessage.info(t("voxel.view.namePrompt.info"));
  }
};

// 更新体素名称
const named = async (id: string | number, name: string) => {
  const voxel = { name };
  try {
    if (voxelData.value) {
      const response = await putVoxel(id, voxel);
      voxelData.value.name = response.data.name;
    }
  } catch (error) {
    console.error(error);
  }
};

// 更新体素信息和缩略图
const updateVoxel = async (imageId: number, info: VoxelInfo) => {
  if (!voxelData.value) return;
  const voxel = { image_id: imageId, info: JSON.stringify(info) };
  try {
    const response = await putVoxel(voxelData.value.id, voxel);
    voxelData.value.image_id = response.data.image_id;
    voxelData.value.info = response.data.info;
    expire.value = false;
  } catch (error) {
    console.error(error);
  }
};

// 保存体素缩略图文件
const saveFile = async (
  md5: string,
  extension: string,
  info: VoxelInfo,
  file: File,
  handler: unknown
) => {
  extension = extension.startsWith(".") ? extension : `.${extension}`;
  const data: UploadFileType = {
    md5,
    key: md5 + extension,
    filename: file.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    url: store.fileUrl(md5, extension, handler as any, "screenshot/voxel"),
  };

  // 保存缩略图并更新体素信息
  const response = await postFile(data);
  await updateVoxel(response.data.id!, info);
};

// 处理体素加载完成，生成缩略图
const loaded = async (info: VoxelInfo) => {
  if (prepare.value) {
    expire.value = false;
    return;
  }

  if (!voxelData.value) return;

  // 获取体素渲染的截图
  const blob: Blob | undefined = await three.value?.screenshot();

  if (blob) {
    // 创建文件对象
    const file: File = new File([blob], voxelData.value.name, {
      type: "image/jpeg",
      lastModified: new Date().getTime(),
    });

    const extension = ".jpg";
    const md5 = await store.fileMD5(file);
    const handler = await store.publicHandler();

    // 检查文件是否已存在
    const has = await store.fileHas(
      md5,
      extension,
      handler,
      "screenshot/voxel"
    );

    // 如果文件不存在，则上传
    if (!has) {
      await store.fileUpload(
        md5,
        extension,
        file,
        () => {},
        handler,
        "screenshot/voxel"
      );
    }

    // 保存文件信息
    await saveFile(md5, extension, info, file, handler);
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadVoxelData();
});
</script>

<style lang="scss" scoped>
@use "@/styles/view-style.scss" as *;
</style>
